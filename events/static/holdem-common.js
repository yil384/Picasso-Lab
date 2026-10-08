// Hold'em helpers shared by the screens: card codes, hand names, chip numbers, seat names.
// Cards are "As", "Td" (rank 23456789TJQKA + suit shdc); the Guandan card component takes { rank, suit }.

export const RANKS = "23456789TJQKA";
const RANK_TEXT = { T: "10" };

export function toCard(code, id = code) {
    return { id, rank: RANK_TEXT[code[0]] || code[0], suit: code[1].toUpperCase() };
}

export function fmt(n) {
    return Math.round(Number(n) || 0).toLocaleString("en-US");
}

// 1,240 -> "1,240"; 12,500 -> "12.5K"; for tight plates only
export function short(n) {
    const v = Math.round(Number(n) || 0);
    if (Math.abs(v) < 10000) return fmt(v);
    const k = v / 1000;
    return `${Math.abs(k) < 100 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}K`;
}

const CAT = {
    high: ["High Card", "高牌"],
    pair: ["Pair", "一对"],
    two_pair: ["Two Pair", "两对"],
    trips: ["Three of a Kind", "三条"],
    straight: ["Straight", "顺子"],
    flush: ["Flush", "同花"],
    full_house: ["Full House", "葫芦"],
    quads: ["Four of a Kind", "四条"],
    straight_flush: ["Straight Flush", "同花顺"],
    royal: ["Royal Flush", "皇家同花顺"]
};
export const CAT_ORDER = ["royal", "straight_flush", "quads", "full_house", "flush", "straight", "trips", "two_pair", "pair", "high"];

export function catName(cat, L) {
    const n = CAT[cat] || CAT.high;
    return L(n[0], n[1]);
}

// The category of a best five, royal split from straight flush (the service may send either).
export function handCat(hand) {
    if (!hand) return "";
    if (hand.cat === "straight_flush" && hand.cards?.some(c => c[0] === "A") && hand.cards.some(c => c[0] === "K")) return "royal";
    return hand.cat;
}

// "两对 · K 和 7", "Two Pair · K & 7": the ranks that decide, read from the five cards themselves.
export function handLabel(hand, L) {
    if (!hand?.cards?.length) return "";
    const cat = handCat(hand);
    const counts = {};
    hand.cards.forEach(c => { counts[c[0]] = (counts[c[0]] || 0) + 1; });
    const groups = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || RANKS.indexOf(b) - RANKS.indexOf(a));
    const r = k => RANK_TEXT[k] || k;
    const ranks = hand.cards.map(c => c[0]).sort((a, b) => RANKS.indexOf(b) - RANKS.indexOf(a));
    // a wheel straight (A-5) tops at 5
    const top = (cat === "straight" || cat === "straight_flush") && ranks[0] === "A" && ranks[1] === "5" ? "5" : ranks[0];
    const name = catName(cat, L);
    const detail = {
        high: L(`${r(groups[0])} high`, `${r(groups[0])} 高`),
        pair: r(groups[0]),
        two_pair: L(`${r(groups[0])} & ${r(groups[1])}`, `${r(groups[0])} 和 ${r(groups[1])}`),
        trips: r(groups[0]),
        straight: L(`to ${r(top)}`, `到 ${r(top)}`),
        flush: L(`${r(ranks[0])} high`, `${r(ranks[0])} 高`),
        full_house: L(`${r(groups[0])} over ${r(groups[1])}`, `${r(groups[0])} 带 ${r(groups[1])}`),
        quads: r(groups[0]),
        straight_flush: L(`to ${r(top)}`, `到 ${r(top)}`),
        royal: ""
    }[cat];
    return detail ? `${name} · ${detail}` : name;
}

// The service names its bots by personality (Stone / Blaze / Fox / Sage, numbered when repeated).
const BOT_NAMES = { steady: ["Stone", "石头"], fierce: ["Blaze", "烈火"], sly: ["Fox", "狐狸"], veteran: ["Sage", "老将"] };
export function seatName(seat, L) {
    if (!seat) return "";
    if (!seat.bot) return seat.name || "";
    const n = BOT_NAMES[seat.bot];
    if (!n) return seat.name;
    const num = /\s(\d+)$/.exec(seat.name || "")?.[1];
    return `${L(n[0], n[1])}${num ? ` ${num}` : ""}`;
}
// the mark on a bot's robot face
export function botMark(seat, L) {
    const n = BOT_NAMES[seat?.bot];
    return n ? L(n[0][0], n[1][0]) : "AI";
}

export const ACTIONS = {
    sb: ["SB", "小盲"],
    bb: ["BB", "大盲"],
    check: ["Check", "过牌"],
    call: ["Call", "跟注"],
    bet: ["Bet", "下注"],
    raise: ["Raise", "加注"],
    allin: ["All-in", "全下"],
    fold: ["Fold", "弃牌"],
    timeout: ["Time out", "超时"],
    muck: ["Muck", "盖牌"],
    show: ["Show", "亮牌"]
};
export function actionName(a, L) {
    const n = ACTIONS[a];
    return n ? L(n[0], n[1]) : "";
}

export const BLIND_PRESETS = ["5/10", "10/20", "25/50", "50/100"];
