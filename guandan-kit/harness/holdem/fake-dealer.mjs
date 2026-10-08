// Test-only stand-in for events/holdem-dealer: speaks the DESIGN.md §5/§6 protocol (HTTP /v1/* and the
// /v1/ws socket) with scripted table snapshots, so every Hold'em screen and state can be built and
// screenshotted before (or without) the real dealer. Play money, in memory, never deployed.
//   node fake-dealer.mjs            PORT (default 8790)
// Test controls (no auth, localhost only):
//   POST /__scene {code, name, n?, hero?}   replace a table with a scripted scene (see SCENES) and push it
//   POST /__drop {ms}                       close every socket (1012) and refuse new ones for ms
//   POST /__email {lid}                     complete a pending email link (the next poll returns done)
//   POST /__suggest {names:[..]}            fresh sessions get these "continue as" suggestions
//   GET  /__tables                          codes of the open tables
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT) || 8790;
const rnd = (n = 12) => crypto.randomBytes(n).toString("base64url");
const now = () => Date.now();

// ---------------------------------------------------------------- accounts
const accounts = new Map();        // id -> account
const tokens = new Map();          // token -> id
const links = new Map();           // lid -> { id, poll, done }
let suggestNames = [];
const sids = new Map();            // sid -> id
const PROTECTED = new Set(["yufei"]);

function newAccount(name) {
    const id = "u_" + rnd(8);
    const a = { id, pid: "p_" + rnd(6), name: name || "Lab Player", guest: true, email: null, chips: 10000, refills: 0,
        holdem: { hands: 0, won: 0, biggestPot: 0, net: 0, showdowns: 0 }, guandan: { rounds: 0, wins: 0 }, seen: [] };
    accounts.set(id, a);
    return a;
}
function issue(a) {
    const t = rnd(32);
    tokens.set(t, a.id);
    return t;
}
const view = a => ({ pid: a.pid, name: a.name, guest: a.guest, email: a.email, chips: a.chips, refills: a.refills,
    holdem: a.holdem, guandan: a.guandan, protected: !a.guest });
function bearer(req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    return m ? accounts.get(tokens.get(m[1])) : null;
}

const LEADERS = [
    ["Zhuo", 18420, 412, 121, 6200], ["Zaifeng", 9650, 388, 97, 4100], ["Zhongkai", 7210, 251, 70, 5300],
    ["Mia", 3300, 120, 31, 1800], ["Yufei", 2100, 96, 30, 2600], ["Lab Player", 900, 44, 12, 900],
    ["Haotian", -400, 80, 19, 1200], ["Keyi", -1250, 61, 13, 700]
];

function http1(req, res, body) {
    const origin = req.headers.origin;
    const head = { "content-type": "application/json", "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-private-network": "true" };
    if (origin) head["access-control-allow-origin"] = origin;
    const send = (code, obj) => { res.writeHead(code, head); res.end(JSON.stringify(obj)); };
    if (req.method === "OPTIONS") return send(204, {});
    const url = new URL(req.url, "http://x");
    const p = url.pathname;
    const me = bearer(req);
    const need = () => (me ? false : (send(401, { error: "bad_token" }), true));
    if (p === "/v1/health") return send(200, { ok: true, tables: tables.size, players: 0, uptime: 1 });
    if (p === "/v1/session") {
        let a = me;
        let token;
        if (!a) {
            a = newAccount(body.name);
            token = issue(a);
        }
        if (body.name && a.guest) a.name = String(body.name).slice(0, 24);
        const out = { account: view(a), features: { emailLink: true } };
        if (token) out.token = token;
        if (body.fresh && suggestNames.length) {
            out.suggestions = suggestNames.slice(0, 3).map(name => {
                const sid = "s_" + rnd(6);
                const target = newAccount(name);
                target.holdem.hands = 40;
                sids.set(sid, target.id);
                return { sid, name };
            });
        }
        return send(200, out);
    }
    if (p === "/v1/claim") {
        if (need()) return;
        const id = sids.get(body.sid);
        if (!id) return send(404, { error: "expired" });
        sids.delete(body.sid);
        const a = accounts.get(id);
        return send(200, { token: issue(a), account: view(a) });
    }
    if (p === "/v1/me") return need() || send(200, { account: view(me) });
    if (p === "/v1/name") {
        if (need()) return;
        const name = String(body.name || "").trim();
        if (!name || name.length > 24) return send(400, { error: "bad_name" });
        if (PROTECTED.has(name.toLowerCase().replace(/\s+/g, ""))) return send(409, { error: "name_protected" });
        me.name = name;
        return send(200, { account: view(me) });
    }
    if (p === "/v1/refill") {
        if (need()) return;
        if (me.chips >= 2000) return send(409, { error: "not_needed" });
        me.chips = 10000;
        me.refills++;
        return send(200, { account: view(me) });
    }
    if (p === "/v1/leaderboard") {
        const game = url.searchParams.get("game");
        const rows = game === "guandan"
            ? LEADERS.map(([name], i) => ({ pid: "p_l" + i, name, rounds: 40 - i * 3, wins: 22 - i * 2 }))
            : LEADERS.map(([name, net, hands, won, biggestPot], i) => ({ pid: "p_l" + i, name, chips: 10000 + net, net, hands, won, biggestPot }));
        const out = { rows };
        if (me) out.me = game === "guandan" ? { pid: me.pid, name: me.name, rounds: me.guandan.rounds, wins: me.guandan.wins }
            : { pid: me.pid, name: me.name, chips: me.chips, net: me.holdem.net, hands: me.holdem.hands, won: me.holdem.won, biggestPot: me.holdem.biggestPot, rank: 23 };
        return send(200, out);
    }
    if (p === "/v1/guandan/round") {
        if (need()) return;
        const key = `${body.room}:${body.round}`;
        if (!me.seen.includes(key)) {
            me.seen.push(key);
            me.guandan.rounds++;
            if (body.won) me.guandan.wins++;
            console.log("guandan round", key, JSON.stringify(body));
        }
        return send(200, { ok: true });
    }
    if (p === "/v1/email/start") {
        if (need()) return;
        const lid = "l_" + rnd(8);
        const poll = rnd(16);
        links.set(lid, { id: me.id, poll, email: String(body.email || ""), done: false });
        return send(200, { lid, poll });
    }
    if (p === "/v1/email/poll") {
        const l = links.get(body.lid);
        if (!l || l.poll !== body.poll) return send(404, { error: "expired" });
        if (!l.done) return send(200, { status: "pending" });
        const a = accounts.get(l.id);
        return send(200, { status: "done", token: issue(a), account: view(a) });
    }
    if (p === "/v1/email/complete") {
        const l = links.get(body.lid);
        if (!l) return send(404, { error: "expired" });
        if (body.idToken !== "test-id-token") return send(401, { error: "bad_token" });
        completeLink(l);
        return send(200, { ok: true, name: accounts.get(l.id).name });
    }
    if (p === "/v1/signout") return need() || send(200, { ok: true });
    // ---- test controls
    if (p === "/__scene") {
        const t = tables.get(body.code) || makeTable(body.code || code5(), [...accounts.values()].pop());
        applyScene(t, body.name, body);
        broadcast(t);
        return send(200, { ok: true, code: t.code });
    }
    if (p === "/__drop") {
        dropUntil = now() + (Number(body.ms) || 4000);
        for (const s of sockets) s.close(1012);
        return send(200, { ok: true });
    }
    if (p === "/__email") {
        const l = links.get(body.lid) || [...links.values()].pop();
        if (l) completeLink(l);
        return send(200, { ok: !!l });
    }
    if (p === "/__suggest") {
        suggestNames = body.names || [];
        return send(200, { ok: true });
    }
    if (p === "/__tables") return send(200, { codes: [...tables.keys()] });
    send(404, { error: "not_found" });
}

function completeLink(l) {
    const a = accounts.get(l.id);
    a.guest = false;
    const [user, domain] = l.email.split("@");
    a.email = `${(user || "y")[0]}***@${domain || "ucsd.edu"}`;
    l.done = true;
}

// ---------------------------------------------------------------- tables
const tables = new Map();
const code5 = () => Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[crypto.randomInt(32)]).join("");
const BLINDS = { "5/10": [5, 10], "10/20": [10, 20], "25/50": [25, 50], "50/100": [50, 100] };
const BOTS = ["steady", "fierce", "sly", "veteran"];

function settingsFrom(s = {}) {
    const [sb, bb] = BLINDS[s.blinds] || [10, 20];
    return { sb, bb, minBuyIn: bb * 40, maxBuyIn: bb * 100, seats: Math.min(9, Math.max(2, Number(s.seats) || 6)),
        actionSec: [15, 20, 30].includes(Number(s.actionSec)) ? Number(s.actionSec) : 20, timeBankSec: Number(s.timeBankSec) || 30 };
}

function makeTable(code, host, settings) {
    const s = settingsFrom(settings);
    const t = { code, host: host?.pid || null, hostId: host?.id, rev: 1, phase: "waiting", settings: s,
        seats: Array(s.seats).fill(null), hand: null, log: [], last: null, me: new Map(), watchers: new Set(), step: 0 };
    tables.set(code, t);
    return t;
}

function seatOf(t, pid) { return t.seats.findIndex(s => s && s.pid === pid); }
function humanSeat(a, stack, extra = {}) {
    return { pid: a.pid, name: a.name, bot: null, stack, bet: 0, state: "playing", connected: true, inHand: false, shown: null, last: null, timeBank: 30, ...extra };
}
function botSeat(i, stack = 2000, extra = {}) {
    return { pid: "p_bot" + i, name: ["Steady", "Fierce", "Sly", "Veteran"][i % 4] + " AI", bot: BOTS[i % 4], stack, bet: 0, state: "playing",
        connected: true, inHand: false, shown: null, last: null, timeBank: 30, ...extra };
}
const LAB = ["Zhuo", "Zaifeng", "Zhongkai", "Mia", "Yufei", "Haotian", "Keyi", "Xiang"];
function labSeat(i, stack, extra = {}) {
    return { pid: "p_h" + i, name: LAB[i % LAB.length], bot: null, stack, bet: 0, state: "playing", connected: true, inHand: false, shown: null, last: null, timeBank: 30, ...extra };
}

function publicTable(t) {
    return { code: t.code, phase: t.phase, host: t.host, rev: t.rev, settings: t.settings, seats: t.seats, hand: t.hand, log: t.log, last: t.last };
}
function meFor(t, a) {
    if (!a) return null;
    const seat = seatOf(t, a.pid);
    const m = t.me.get(a.pid) || {};
    return { pid: a.pid, seat: seat >= 0 ? seat : null, chips: a.chips, hole: null, best: null, legal: null, canShow: false, pendingTopUp: 0, ...m, ...(seat < 0 ? { hole: null, best: null, legal: null } : {}) };
}
function broadcast(t) {
    t.rev++;
    for (const s of t.watchers) s.json({ t: "state", rev: t.rev, table: { ...publicTable(t), rev: t.rev }, me: meFor(t, s.account), serverTime: now() });
}

// ---------------------------------------------------------------- scenes
// Builds a running hand around the hero. `hero` = the hero's seat index, `n` = seat count.
function hand(t, opts) {
    const { street = "preflop", board = [], button = 0, sb = 1, bb = 2, toAct = null, pots = [], currentBet = 0, minRaiseTo = 0,
        winners = null, done = false, usingBank = false, deadlineIn = t.settings.actionSec * 1000 } = opts;
    t.hand = { id: "h_" + rnd(4), no: opts.no || 37, street, board, button, sbSeat: sb, bbSeat: bb, toAct,
        deadline: toAct == null ? null : now() + deadlineIn, usingBank, currentBet, minRaiseTo, pots, winners, done };
    t.phase = "running";
}

function applyScene(t, name, o = {}) {
    const hostAcc = accounts.get(t.hostId) || [...accounts.values()].pop() || newAccount("Yichen");
    const n = Number(o.n) || ({ heads: 2, nine: 9, spectator: 6 }[name] || 6);
    const heroAt = o.hero != null ? Number(o.hero) : Math.min(3, n - 1);
    t.settings = { ...t.settings, seats: n };
    t.seats = Array(n).fill(null);
    t.me = new Map();
    t.log = [];
    const fill = (i, s) => { if (i < n) t.seats[i] = s; };
    const hero = (stack, extra = {}, me = {}) => {
        t.seats[heroAt] = humanSeat(hostAcc, stack, extra);
        t.me.set(hostAcc.pid, me);
    };
    const others = (fn) => { for (let i = 0, k = 0; i < n; i++) if (i !== heroAt) fn(i, k++); };
    const H = { hole: ["Ah", "Kd"] };
    t.last = { no: 36, board: ["Jc", "8d", "8s", "3h", "Ad"], winners: [{ seat: (heroAt + 2) % n, amt: 640, pot: 0, hand: { cat: "trips", name: "Trips", cards: ["8d", "8s", "8h", "Ad", "Jc"] } }],
        shown: { [(heroAt + 2) % n]: ["8h", "Qc"], [heroAt]: ["Kc", "Kh"] } };
    switch (name) {
        case "preflop": case "nine": case "heads": case "timebank": {
            const btn = (heroAt + n - 3 + n) % n;
            const sbS = n === 2 ? btn : (btn + 1) % n;
            const bbS = (sbS + 1) % n;
            others((i, k) => fill(i, k % 2 ? botSeat(k, 1600 + k * 140) : labSeat(k, 2000 - k * 90)));
            hero(2000, { inHand: true }, { hole: name === "heads" ? ["Qs", "Qh"] : H.hole, legal: { fold: true, check: false, call: 60, minRaiseTo: 100, maxRaiseTo: 2000, canRaise: true } });
            t.seats.forEach(s => { if (s) s.inHand = true; });
            t.seats[sbS].bet = 10; t.seats[sbS].last = { a: "sb", amt: 10 };
            t.seats[bbS].bet = 20; t.seats[bbS].last = { a: "bb", amt: 20 };
            const raiser = n > 3 ? (bbS + 1) % n === heroAt ? (heroAt + 1) % n : (bbS + 1) % n : null;
            if (raiser != null && raiser !== heroAt) { t.seats[raiser].bet = 60; t.seats[raiser].last = { a: "raise", amt: 60 }; }
            if (n > 5) { const f = (heroAt + n - 1) % n; if (f !== sbS && f !== bbS && f !== raiser) { t.seats[f].state = "folded"; t.seats[f].inHand = false; t.seats[f].last = { a: "fold" }; } }
            const timebank = name === "timebank" || name === "nine";
            const actor = timebank ? (heroAt + 2) % n : heroAt;
            if (timebank) { t.seats[actor].timeBank = 12; t.me.get(hostAcc.pid).legal = null; }
            hand(t, { button: btn, sb: sbS, bb: bbS, toAct: actor, currentBet: raiser != null ? 60 : 20, minRaiseTo: raiser != null ? 100 : 40,
                usingBank: timebank, deadlineIn: timebank ? 12000 : t.settings.actionSec * 1000 });
            if (n === 2) t.me.get(hostAcc.pid).legal = { fold: true, check: false, call: 10, minRaiseTo: 40, maxRaiseTo: 2000, canRaise: true };
            break;
        }
        case "flop": case "turn": case "river": {
            const board = { flop: ["Kh", "7c", "2d"], turn: ["Kh", "7c", "2d", "7s"], river: ["Kh", "7c", "2d", "7s", "Qs"] }[name];
            others((i, k) => fill(i, k % 2 ? botSeat(k, 1500 + k * 120) : labSeat(k, 1800 - k * 60)));
            t.seats.forEach(s => { if (s) { s.inHand = true; } });
            const out = [(heroAt + 1) % n, (heroAt + 4) % n];
            out.forEach(i => { t.seats[i].state = "folded"; t.seats[i].inHand = false; t.seats[i].last = { a: "fold" }; });
            const bettor = (heroAt + 2) % n;
            const best = { flop: { cat: "pair", name: "Pair", cards: ["Kd", "Kh", "Ah", "7c", "2d"] },
                turn: { cat: "two_pair", name: "Two Pair", cards: ["Kd", "Kh", "7c", "7s", "Ah"] },
                river: { cat: "two_pair", name: "Two Pair", cards: ["Kd", "Kh", "7c", "7s", "Ah"] } }[name];
            if (name === "turn") {
                hero(1640, { inHand: true, last: { a: "check" } }, { hole: H.hole, best, legal: null });
                t.seats[bettor].bet = 240; t.seats[bettor].last = { a: "bet", amt: 240 };
                hand(t, { street: name, board, button: (heroAt + 3) % n, sb: (heroAt + 4) % n, bb: (heroAt + 5) % n, toAct: (heroAt + 3) % n,
                    pots: [{ amt: 720, seats: [heroAt, bettor, (heroAt + 3) % n, (heroAt + 5) % n] }], currentBet: 240, minRaiseTo: 480 });
            } else if (name === "river") {
                hero(1400, { inHand: true }, { hole: H.hole, best, legal: { fold: true, check: true, call: 0, minRaiseTo: 20, maxRaiseTo: 1400, canRaise: true } });
                hand(t, { street: name, board, button: (heroAt + 3) % n, sb: (heroAt + 4) % n, bb: (heroAt + 5) % n, toAct: heroAt,
                    pots: [{ amt: 1680, seats: [heroAt, bettor, (heroAt + 3) % n] }], currentBet: 0, minRaiseTo: 20 });
                t.seats[(heroAt + 5) % n].state = "folded"; t.seats[(heroAt + 5) % n].inHand = false;
            } else {
                hero(1880, { inHand: true }, { hole: H.hole, best, legal: { fold: true, check: false, call: 120, minRaiseTo: 240, maxRaiseTo: 1880, canRaise: true } });
                t.seats[bettor].bet = 120; t.seats[bettor].last = { a: "bet", amt: 120 };
                hand(t, { street: name, board, button: (heroAt + 3) % n, sb: (heroAt + 4) % n, bb: (heroAt + 5) % n, toAct: heroAt,
                    pots: [{ amt: 240, seats: [heroAt, bettor, (heroAt + 3) % n, (heroAt + 5) % n] }], currentBet: 120, minRaiseTo: 240 });
            }
            t.log = [{ seat: bettor, a: "bet", amt: 120, street: "flop" }];
            break;
        }
        case "allin": {
            others((i, k) => fill(i, k % 2 ? botSeat(k, 0) : labSeat(k, 0)));
            const a = (heroAt + 1) % n, b = (heroAt + 2) % n, c = (heroAt + 4) % n;
            t.seats.forEach((s, i) => { if (s && ![a, b, c].includes(i)) { s.state = "folded"; s.stack = 1700 + i * 37; } });
            hero(0, { inHand: true, state: "allin", shown: ["Ah", "Kd"], last: { a: "allin", amt: 2000 } }, { hole: ["Ah", "Kd"], best: { cat: "pair", name: "Pair", cards: ["Ah", "Ad", "Kd", "Qc", "9c"] } });
            Object.assign(t.seats[a], { stack: 0, state: "allin", inHand: true, shown: ["Qh", "Qd"], last: { a: "allin", amt: 600 } });
            Object.assign(t.seats[b], { stack: 0, state: "allin", inHand: true, shown: ["9s", "9h"], last: { a: "allin", amt: 1400 } });
            Object.assign(t.seats[c], { stack: 380, state: "playing", inHand: true, shown: ["Jc", "Tc"], last: { a: "call", amt: 2000 } });
            hand(t, { street: "turn", board: ["Ad", "9c", "4c", "Qc"], button: c, toAct: null,
                pots: [{ amt: 2400, seats: [heroAt, a, b, c] }, { amt: 2400, seats: [heroAt, b, c] }, { amt: 1200, seats: [heroAt, c] }] });
            break;
        }
        case "showdown": case "split": case "quads": {
            others((i, k) => fill(i, k % 2 ? botSeat(k, 1500) : labSeat(k, 1700)));
            const v = (heroAt + 2) % n;
            t.seats.forEach((s, i) => { if (s && i !== v) { s.state = "folded"; } });
            const split = name === "split", quads = name === "quads";
            const board = quads ? ["8c", "8d", "Ks", "8h", "2c"] : split ? ["Th", "Jd", "Qc", "Ks", "4d"] : ["Kh", "7c", "2d", "7s", "Qs"];
            const heroHole = quads ? ["8s", "Kd"] : split ? ["Ah", "3c"] : ["Ah", "Kd"];
            const vHole = quads ? ["Ac", "Kc"] : split ? ["As", "9s"] : ["Qh", "Jh"];
            const heroHand = quads ? { cat: "quads", name: "Quads", cards: ["8s", "8c", "8d", "8h", "Ks"] }
                : split ? { cat: "straight", name: "Straight", cards: ["Ah", "Ks", "Qc", "Jd", "Th"] } : { cat: "two_pair", name: "Two Pair", cards: ["Kd", "Kh", "7c", "7s", "Ah"] };
            hero(split ? 1200 : quads ? 2600 + 4200 : 1400 + 1680, { inHand: true, state: "playing", shown: heroHole, last: { a: "show" } }, { hole: heroHole, best: heroHand });
            Object.assign(t.seats[v], { inHand: true, state: "playing", shown: vHole, last: { a: "show" }, stack: split ? 1100 : 900 });
            const amt = quads ? 4200 : 1680;
            const winners = split
                ? [{ seat: heroAt, amt: 840, pot: 0, hand: heroHand }, { seat: v, amt: 840, pot: 0, hand: { cat: "straight", name: "Straight", cards: ["As", "Ks", "Qc", "Jd", "Th"] } }]
                : [{ seat: heroAt, amt, pot: 0, hand: heroHand }];
            hand(t, { street: "showdown", board, button: (heroAt + 3) % n, toAct: null, pots: [{ amt, seats: [heroAt, v] }], winners, done: true });
            t.seats[heroAt].stack -= split ? 0 : 0;
            break;
        }
        case "waiting": case "sitout": case "busted": case "spectator": {
            others((i, k) => fill(i, name === "spectator" && k > 2 ? null : k % 2 ? botSeat(k, 1500) : labSeat(k, 1900)));
            t.seats.forEach(s => { if (s) s.inHand = true; });
            const actor = (heroAt + 1) % n;
            if (name !== "spectator") {
                const state = { waiting: "waiting", sitout: "out", busted: "busted" }[name];
                hero(name === "busted" ? 0 : 1500, { state, inHand: false }, { hole: null, legal: null });
                if (name === "busted") hostAcc.chips = Math.max(hostAcc.chips, 6200);
            }
            hand(t, { street: "flop", board: ["5s", "6d", "Jh"], button: actor, toAct: actor, pots: [{ amt: 300, seats: [] }], currentBet: 0 });
            break;
        }
        case "room": {
            t.phase = "waiting";
            t.hand = null;
            hero(2000, { state: "waiting" });
            fill((heroAt + 2) % n, labSeat(0, 2000, { state: "waiting" }));
            fill((heroAt + 3) % n, botSeat(1, 2000, { state: "waiting" }));
            break;
        }
    }
    t.host = hostAcc.pid;
}

// ---------------------------------------------------------------- socket ops
function onMessage(s, msg) {
    if (msg.t === "hello") {
        s.account = accounts.get(tokens.get(msg.token));
        if (!s.account) return s.json({ t: "error", code: "bad_token", re: "hello" });
        return s.json({ t: "welcome", account: view(s.account), serverTime: now(), features: { emailLink: true } });
    }
    if (!s.account) return s.json({ t: "error", code: "no_hello", re: msg.t });
    if (msg.t === "ping") return s.json({ t: "pong", serverTime: now() });
    const a = s.account;
    if (msg.t === "create") {
        const t = makeTable(code5(), a, msg.settings);
        s.json({ t: "created", code: t.code });
        watch(s, t);
        if (msg.practice) {
            t.seats[0] = humanSeat(a, Math.min(t.settings.maxBuyIn, a.chips));
            a.chips -= t.seats[0].stack;
            for (let i = 1; i < t.settings.seats; i++) t.seats[i] = botSeat(i);
            applyScene(t, "preflop", { hero: 0, n: t.settings.seats });
            t.step = 0;
        }
        return broadcast(t);
    }
    if (msg.t === "watch") {
        const t = tables.get(String(msg.code || "").toUpperCase());
        if (!t) return s.json({ t: "error", code: "no_table", re: "watch" });
        return watch(s, t, true);
    }
    if (msg.t === "unwatch") { if (s.table) s.table.watchers.delete(s); s.table = null; return; }
    const t = s.table;
    if (!t) return s.json({ t: "error", code: "no_table", re: msg.t });
    const mine = seatOf(t, a.pid);
    const err = code => s.json({ t: "error", code, re: msg.t });
    switch (msg.t) {
        case "sit": {
            if (t.seats[msg.seat]) return err("seat_taken");
            if (mine >= 0) return err("already_seated");
            if (!(msg.buyIn >= t.settings.minBuyIn && msg.buyIn <= t.settings.maxBuyIn)) return err("bad_amount");
            if (msg.buyIn > a.chips) return err("insufficient_chips");
            a.chips -= msg.buyIn;
            t.seats[msg.seat] = humanSeat(a, msg.buyIn, { state: "waiting" });
            s.json({ t: "account", account: view(a) });
            return broadcast(t);
        }
        case "stand":
            if (mine < 0) return err("not_seated");
            a.chips += t.seats[mine].stack;
            t.seats[mine] = null;
            s.json({ t: "account", account: view(a) });
            return broadcast(t);
        case "sitOut":
            if (mine < 0) return err("not_seated");
            t.seats[mine].state = msg.on ? "out" : "waiting";
            return broadcast(t);
        case "postBB":
            if (mine < 0) return err("not_seated");
            t.seats[mine].state = "playing";
            return broadcast(t);
        case "topUp":
            t.me.set(a.pid, { ...(t.me.get(a.pid) || {}), pendingTopUp: Number(msg.amount) || 0 });
            if (mine >= 0 && t.seats[mine].state === "busted") {
                t.seats[mine].stack = Number(msg.amount);
                t.seats[mine].state = "waiting";
                a.chips -= Number(msg.amount);
                t.me.set(a.pid, { ...(t.me.get(a.pid) || {}), pendingTopUp: 0 });
            }
            return broadcast(t);
        case "show":
            if (mine >= 0) { t.seats[mine].shown = (t.me.get(a.pid) || {}).hole || null; return broadcast(t); }
            return;
        case "host": {
            if (t.host !== a.pid) return err("not_host");
            if (msg.op === "settings") {
                if (t.phase !== "waiting") return err("not_waiting");
                const s2 = settingsFrom(msg.settings);
                t.seats = Array.from({ length: s2.seats }, (_, i) => t.seats[i] || null);
                t.settings = s2;
            } else if (msg.op === "fillBots") {
                t.seats = t.seats.map((x, i) => x || botSeat(i, t.settings.maxBuyIn, { state: "waiting" }));
            } else if (msg.op === "removeBot") {
                if (t.seats[msg.seat]?.bot) t.seats[msg.seat] = null;
            } else if (msg.op === "start") {
                if (t.seats.filter(Boolean).length < 2) return err("not_enough_players");
                const hero = mine;
                applyScene(t, "preflop", { hero, n: t.settings.seats });
                t.step = 0;
            } else if (msg.op === "dissolve") {
                for (const w of t.watchers) w.json({ t: "closed", code: t.code, reason: "dissolved" });
                tables.delete(t.code);
                return;
            }
            return broadcast(t);
        }
        case "act": {
            if (!t.hand || t.hand.id !== msg.hand) return err("stale_hand");
            if (t.hand.toAct !== mine) return err("not_your_turn");
            const seat = t.seats[mine];
            const legal = (t.me.get(a.pid) || {}).legal || {};
            if (msg.action === "raise" && !(msg.to >= legal.minRaiseTo && msg.to <= legal.maxRaiseTo)) return err("bad_amount");
            const amt = msg.action === "call" ? legal.call : msg.action === "raise" ? msg.to : msg.action === "allin" ? seat.stack + seat.bet : 0;
            seat.last = { a: msg.action === "raise" && !t.hand.currentBet ? "bet" : msg.action, amt };
            if (amt) { seat.stack -= Math.max(0, amt - seat.bet); seat.bet = Math.max(seat.bet, amt); }
            if (msg.action === "fold") { seat.state = "folded"; seat.inHand = false; }
            t.log.push({ seat: mine, a: seat.last.a, amt, street: t.hand.street });
            t.hand.toAct = (mine + 1) % t.seats.length;
            t.hand.deadline = now() + t.settings.actionSec * 1000;
            t.me.set(a.pid, { ...(t.me.get(a.pid) || {}), legal: null });
            broadcast(t);
            // scripted progression: the street closes, the next one opens on the hero again
            const heroAt = mine, n = t.seats.length;
            setTimeout(() => {
                if (!tables.has(t.code)) return;
                const stack = seat.stack;
                const order = ["flop", "turn", "river", "showdown"];
                const next = msg.action === "fold" ? "showdown" : order[t.step++] || "showdown";
                if (next === "showdown") {
                    applyScene(t, "showdown", { hero: heroAt, n });
                    if (msg.action === "fold") { t.seats[heroAt].shown = null; t.seats[heroAt].state = "folded"; t.hand.winners = [{ seat: (heroAt + 2) % n, amt: 900, pot: 0, hand: null }]; t.seats[(heroAt + 2) % n].shown = null; }
                    broadcast(t);
                    setTimeout(() => { if (tables.has(t.code)) { applyScene(t, "preflop", { hero: heroAt, n }); t.step = 0; broadcast(t); } }, 5200);
                } else {
                    applyScene(t, next, { hero: heroAt, n });
                    if (next === "turn") { t.hand.toAct = heroAt; t.me.get(a.pid).legal = { fold: true, check: false, call: 240, minRaiseTo: 480, maxRaiseTo: stack, canRaise: true }; }
                    broadcast(t);
                }
            }, 900);
            return;
        }
    }
}

function watch(s, t, push) {
    if (s.table) s.table.watchers.delete(s);
    s.table = t;
    t.watchers.add(s);
    if (push) s.json({ t: "state", rev: t.rev, table: publicTable(t), me: meFor(t, s.account), serverTime: now() });
}

// ---------------------------------------------------------------- minimal RFC 6455 server (text frames)
const sockets = new Set();
let dropUntil = 0;
function upgrade(req, sock) {
    if (now() < dropUntil || new URL(req.url, "http://x").pathname !== "/v1/ws") return sock.destroy();
    const accept = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const s = { sock, account: null, table: null };
    s.send = (op, payload) => {
        const len = payload.length;
        const head = len < 126 ? Buffer.from([0x80 | op, len]) : len < 65536 ? Buffer.from([0x80 | op, 126, len >> 8, len & 255])
            : Buffer.concat([Buffer.from([0x80 | op, 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(len)); return b; })()]);
        if (!sock.destroyed) sock.write(Buffer.concat([head, payload]));
    };
    s.json = obj => s.send(1, Buffer.from(JSON.stringify(obj)));
    s.close = code => { const b = Buffer.alloc(2); b.writeUInt16BE(code); s.send(8, b); sock.end(); };
    sockets.add(s);
    let buf = Buffer.alloc(0);
    sock.on("data", chunk => {
        buf = Buffer.concat([buf, chunk]);
        for (;;) {
            if (buf.length < 2) return;
            const op = buf[0] & 15;
            let len = buf[1] & 127;
            let off = 2;
            if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
            else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
            const masked = buf[1] & 128;
            const need = off + (masked ? 4 : 0) + len;
            if (buf.length < need) return;
            const mask = masked ? buf.subarray(off, off + 4) : null;
            const data = Buffer.from(buf.subarray(off + (masked ? 4 : 0), need));
            if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
            buf = buf.subarray(need);
            if (op === 8) { sock.end(); return; }
            if (op === 9) { s.send(10, data); continue; }
            if (op !== 1) continue;
            let msg;
            try { msg = JSON.parse(data.toString()); } catch { continue; }
            onMessage(s, msg);
        }
    });
    const gone = () => { sockets.delete(s); if (s.table) s.table.watchers.delete(s); };
    sock.on("close", gone);
    sock.on("error", gone);
}

const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", c => { raw += c; });
    req.on("end", () => {
        let body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
        try { http1(req, res, body); } catch (e) { console.error(e); res.writeHead(500); res.end("{}"); }
    });
});
server.on("upgrade", upgrade);
server.listen(PORT, "127.0.0.1", () => console.log(`fake dealer on http://127.0.0.1:${PORT}`));
