// Guandan rules + AI + 提示 engine, shared by events/guandan.html (main thread) and
// events/static/guandan-ai-worker.js (Web Worker). Pure logic over plain JSON game snapshots: no DOM,
// no Firebase, no module state. Lifted verbatim from guandan.html; the only edits are that
// module-global defaults (`g = game`, `lang = uiLang`) became explicit parameters.

function tr(lang, en, zh) {
    return lang === "zh" ? zh : en;
}

export const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
export const suits = ["S","H","D","C"];
export const suitGlyph = { S: "♠", H: "♥", D: "♦", C: "♣" };
const AI_PLAN_SEARCH_LIMIT = 13;
const AI_PLAN_BRANCH_LIMIT = 18;
const AI_GREEDY_PLAN_LIMIT = 24;
const AI_SCORE_MOVE_LIMIT = 36;
const AI_MC_TOP_MOVES = 5;
const AI_MC_MAX_CHOICES = 6;
const AI_MC_MIN_VISITS = 3;
const AI_MC_TARGET_VISITS = 5;
const AI_MC_TIME_MS = 60;
const AI_MC_PLAYOUT_DEPTH = 24;

export function valuesFromFirebase(value) {
    if (Array.isArray(value)) return value.filter(v => v != null);
    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => value[k])
            .filter(v => v != null);
    }
    return [];
}

function indexedFromFirebase(value, length, fallback = null) {
    return Array.from({ length }, (_, i) => value?.[i] ?? fallback);
}

function recomputeComboForEntry(entry, levelRank) {
    const cards = valuesFromFirebase(entry?.cards);
    if (!cards.length) return entry?.combo || null;
    const combos = evaluateCombos(cards, levelRank);
    if (!combos.length) return entry?.combo || null;
    if (entry?.combo?.type) {
        const sameType = combos.find(combo => {
            if (combo.type !== entry.combo.type) return false;
            if (combo.type === "bomb" && entry.combo.bombLen && combo.bombLen !== entry.combo.bombLen) return false;
            return true;
        });
        if (sameType) return sameType;
    }
    return choosePlayable(cards, null, levelRank) || combos[0];
}

function normalizeActionEntry(entry, levelRank = "2") {
    if (!entry || typeof entry !== "object") return entry || null;
    const cards = valuesFromFirebase(entry.cards);
    const combo = cards.length && (entry.combo || entry.actionType === "combo")
        ? recomputeComboForEntry({ ...entry, cards }, levelRank)
        : entry.combo || null;
    return { ...entry, cards, combo };
}

export function normalizeGame(g) {
    if (!g) return null;
    g.seats = indexedFromFirebase(g.seats, 4, null);
    g.levels = indexedFromFirebase(g.levels, 2, "2").map(level => level || "2");
    g.aceFailures = indexedFromFirebase(g.aceFailures, 2, 0).map(n => Math.max(0, Number(n) || 0));
    if (!g.currentLevelRank) g.currentLevelRank = "2";
    g.hands = {
        0: valuesFromFirebase(g.hands?.[0]),
        1: valuesFromFirebase(g.hands?.[1]),
        2: valuesFromFirebase(g.hands?.[2]),
        3: valuesFromFirebase(g.hands?.[3])
    };
    g.finished = valuesFromFirebase(g.finished).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 4);
    g.lastPlay = normalizeActionEntry(g.lastPlay, g.currentLevelRank);
    g.history = valuesFromFirebase(g.history).map(entry => normalizeActionEntry(entry, g.currentLevelRank)).slice(-16);
    g.trickPlays = indexedFromFirebase(g.trickPlays, 4, null).map(entry => normalizeActionEntry(entry, g.currentLevelRank));
    g.selectedTributes = valuesFromFirebase(g.selectedTributes);
    g.publicJokerSeats = valuesFromFirebase(g.publicJokerSeats).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 4);
    if (!g.startingCard) g.startingCard = null;
    if (!g.phase) g.phase = "lobby";
    if (!Number.isInteger(g.currentTurn)) g.currentTurn = 0;
    if (!Number.isInteger(g.passCount)) g.passCount = 0;
    if (!Number.isFinite(g.turnStartedAt)) g.turnStartedAt = Date.now();
    if (!Number.isFinite(g.roundStartedAt)) g.roundStartedAt = 0;
    if (!Number.isFinite(g.dealStartedAt)) g.dealStartedAt = 0;
    return g;
}

export function isWild(card, levelRank) {
    return !card.joker && card.suit === "H" && card.rank === levelRank;
}

export function cardText(card, lang) {
    if (card.joker === "RJ") return lang === "zh" ? "大王" : "Red Joker";
    if (card.joker === "BJ") return lang === "zh" ? "小王" : "Black Joker";
    return `${card.rank}${suitGlyph[card.suit]}`;
}

export function comboName(combo, lang) {
    const zh = lang === "zh";
    if (!combo) return "";
    const labels = {
        jokerBomb: ["Joker Bomb", "天王炸"],
        single: ["Single", "单张"],
        pair: ["Pair", "对子"],
        triple: ["Triple", "三张"],
        fullhouse: ["Full House", "三带二"],
        straight: ["Straight", "顺子"],
        straightFlush: ["Straight Flush", "同花顺"],
        pairStraight: ["Three Consecutive Pairs", "三连对"],
        tripleStraight: ["Triple Run", "钢板"]
    };
    if (combo.type === "bomb") return zh ? `${combo.len} 张炸弹` : `${combo.len}-card Bomb`;
    const label = labels[combo.type] || [combo.name || combo.type, combo.name || combo.type];
    return zh ? label[1] : label[0];
}

export function finishedList(g) {
    return Array.isArray(g?.finished) ? g.finished : [];
}

export function rankBase(rank) {
    return ranks.indexOf(rank) + 2;
}

export function rankPower(rank, levelRank) {
    if (rank === levelRank) return 16;
    return rankBase(rank);
}

export function jokerPower(card) {
    if (card.joker === "RJ") return 18;
    if (card.joker === "BJ") return 17;
    return 0;
}

export function sortCards(cards, levelRank) {
    return [...cards].sort((a, b) => {
        const pa = a.joker ? jokerPower(a) : rankPower(a.rank, levelRank);
        const pb = b.joker ? jokerPower(b) : rankPower(b.rank, levelRank);
        if (pa !== pb) return pb - pa;
        const sa = suits.indexOf(a.suit || "S");
        const sb = suits.indexOf(b.suit || "S");
        return sa - sb || a.id.localeCompare(b.id);
    });
}

export function activeSeatIds(g) {
    if (!g) return [];
    normalizeGame(g);
    const done = finishedList(g);
    return [0,1,2,3].filter(i => g.seats[i] && !done.includes(i));
}

export function requiredPassesForTrick(g) {
    if (!g?.lastPlay) return 0;
    const done = finishedList(g);
    return [0,1,2,3].filter(i => i !== g.lastPlay.player && g.seats[i] && !done.includes(i)).length;
}

export function nextSeat(from, g) {
    const active = activeSeatIds(g);
    if (!active.length) return null;
    for (let step = 1; step <= 4; step++) {
        const n = (from - step + 4) % 4;
        if (active.includes(n)) return n;
    }
    return active[0];
}

export function partnerOf(i) {
    return (i + 2) % 4;
}

export function countRanks(cards) {
    return cards.reduce((m, c) => {
        if (!c.joker) m[c.rank] = (m[c.rank] || 0) + 1;
        return m;
    }, {});
}

function sequenceSets(kind) {
    const straight = [
        ["2","3","4","5","6"], ["3","4","5","6","7"],
        ["4","5","6","7","8"], ["5","6","7","8","9"], ["6","7","8","9","10"],
        ["7","8","9","10","J"], ["8","9","10","J","Q"], ["9","10","J","Q","K"], ["10","J","Q","K","A"]
    ];
    const triple = [
        ["2","3","4"], ["3","4","5"], ["4","5","6"], ["5","6","7"], ["6","7","8"], ["7","8","9"],
        ["8","9","10"], ["9","10","J"], ["10","J","Q"], ["J","Q","K"], ["Q","K","A"]
    ];
    const plate = [
        ["2","3"], ["3","4"], ["4","5"], ["5","6"], ["6","7"], ["7","8"], ["8","9"], ["9","10"],
        ["10","J"], ["J","Q"], ["Q","K"], ["K","A"]
    ];
    if (kind === "straight") return straight;
    if (kind === "pair") return triple;
    return plate;
}

function canFillRanks(nonWild, wildCount, required, sameSuit) {
    const need = {};
    required.forEach(([rank, count]) => need[rank] = count);
    let usedWild = 0;
    for (const c of nonWild) {
        if (c.joker || !need[c.rank]) return false;
        if (sameSuit && c.suit !== sameSuit) return false;
        need[c.rank]--;
        if (need[c.rank] < 0) return false;
    }
    for (const rank of Object.keys(need)) usedWild += need[rank];
    return usedWild <= wildCount;
}

function comboDisplayOrder(cards, required, levelRank, sameSuit = null) {
    const remaining = [...cards];
    const order = [];
    for (const [rank, count] of required) {
        for (let n = 0; n < count; n++) {
            let idx = remaining.findIndex(c => !c.joker && !isWild(c, levelRank) && c.rank === rank && (!sameSuit || c.suit === sameSuit));
            if (idx < 0) idx = remaining.findIndex(c => !c.joker && isWild(c, levelRank));
            if (idx < 0) idx = remaining.findIndex(c => !c.joker && c.rank === rank);
            if (idx >= 0) {
                const [card] = remaining.splice(idx, 1);
                order.push({ id: card.id, targetRank: rank });
            }
        }
    }
    remaining.forEach(card => order.push({ id: card.id, targetRank: card.rank || "" }));
    return order;
}

export function evaluateCombos(cards, levelRank) {
    if (!cards.length) return [];
    const wild = cards.filter(c => isWild(c, levelRank));
    const nonWild = cards.filter(c => !isWild(c, levelRank));
    const wc = wild.length;
    const combos = [];
    const len = cards.length;
    const add = (combo) => combos.push({ ...combo, len, cards });
    const naturalRanks = [...new Set(nonWild.filter(c => !c.joker).map(c => c.rank))];
    const allTargetRanks = ranks;
    const allJokers = cards.every(c => c.joker);

    if (len === 4 && allJokers) add({ type: "jokerBomb", name: "天王炸", isBomb: true, mainPower: 100 });

    if (len === 1) {
        const c = cards[0];
        const p = c.joker ? jokerPower(c) : rankPower(c.rank, levelRank);
        add({ type: "single", name: "单张", mainPower: p });
    }

    if (len === 2 && cards.every(c => c.joker) && cards[0].joker === cards[1].joker) {
        add({ type: "pair", name: "对子", mainPower: jokerPower(cards[0]) });
    }

    for (const rank of allTargetRanks) {
        const rankCards = nonWild.filter(c => !c.joker && c.rank === rank);
        if (rankCards.length + wc === len && nonWild.every(c => !c.joker && c.rank === rank)) {
            if (len === 2) add({ type: "pair", name: "对子", mainPower: rankPower(rank, levelRank) });
            if (len === 3) add({ type: "triple", name: "三张", mainPower: rankPower(rank, levelRank) });
            if (len >= 4) add({ type: "bomb", name: `${len} 张炸弹`, isBomb: true, bombLen: len, mainPower: rankPower(rank, levelRank) });
        }
    }

    if (len === 5) {
        for (const tripleRank of ranks) {
            for (const pairRank of ranks) {
                if (tripleRank === pairRank) continue;
                if (canFillRanks(nonWild, wc, [[tripleRank, 3], [pairRank, 2]], null)) {
                    add({ type: "fullhouse", name: "三带二", mainPower: rankPower(tripleRank, levelRank) });
                }
            }
        }
        for (const seq of sequenceSets("straight")) {
            const req = seq.map(r => [r, 1]);
            if (canFillRanks(nonWild, wc, req, null)) add({ type: "straight", name: "顺子", mainPower: rankBase(seq[seq.length - 1]), displayOrder: comboDisplayOrder(cards, req, levelRank) });
            const naturalSuits = [...new Set(nonWild.filter(c => !c.joker).map(c => c.suit))];
            const suitOptions = naturalSuits.length ? naturalSuits : suits;
            for (const suit of suitOptions) {
                if (canFillRanks(nonWild, wc, req, suit)) {
                    add({ type: "straightFlush", name: "同花顺", isBomb: true, mainPower: rankBase(seq[seq.length - 1]), displayOrder: comboDisplayOrder(cards, req, levelRank, suit) });
                }
            }
        }
    }

    if (len === 6) {
        for (const seq of sequenceSets("pair")) {
            const req = seq.map(r => [r, 2]);
            if (canFillRanks(nonWild, wc, req, null)) {
                add({ type: "pairStraight", name: "三连对", mainPower: rankBase(seq[seq.length - 1]), displayOrder: comboDisplayOrder(cards, req, levelRank) });
            }
        }
        for (const seq of sequenceSets("plate")) {
            const req = seq.map(r => [r, 3]);
            if (canFillRanks(nonWild, wc, req, null)) {
                add({ type: "tripleStraight", name: "钢板", mainPower: rankBase(seq[seq.length - 1]), displayOrder: comboDisplayOrder(cards, req, levelRank) });
            }
        }
    }

    const unique = new Map();
    for (const c of combos) {
        const key = `${c.type}:${c.mainPower}:${c.bombLen || 0}`;
        if (!unique.has(key)) unique.set(key, c);
    }
    return [...unique.values()];
}

function bombScore(c) {
    if (c.type === "jokerBomb") return 10000;
    if (c.type === "straightFlush") return 5500 + c.mainPower;
    if (c.type === "bomb") {
        if (c.bombLen >= 6) return 6000 + c.bombLen * 100 + c.mainPower;
        return c.bombLen * 1000 + c.mainPower;
    }
    return 0;
}

function beats(a, b) {
    if (!b) return true;
    if (a.isBomb || b.isBomb) {
        if (!a.isBomb) return false;
        if (!b.isBomb) return true;
        return bombScore(a) > bombScore(b);
    }
    return a.type === b.type && a.len === b.len && a.mainPower > b.mainPower;
}

export function choosePlayable(cards, lastCombo, levelRank = "2") {
    const combos = evaluateCombos(cards, levelRank);
    const playable = combos.filter(c => beats(c, lastCombo));
    playable.sort((a, b) => {
        if (!!a.isBomb !== !!b.isBomb) return a.isBomb ? 1 : -1;
        return (a.mainPower + bombScore(a)) - (b.mainPower + bombScore(b));
    });
    return playable[0] || null;
}

export function buildPlayerHintPackage(seat, g, lang) {
    const hand = g?.hands?.[seat] || [];
    const lastCombo = g?.lastPlay?.combo || null;
    const levelRank = g?.currentLevelRank || "2";
    const signature = makeHintSignature(seat, g, hand);
    const moves = generateAIMoves(hand, lastCombo, levelRank);
    if (!moves.length) {
        return {
            signature,
            options: [makeHintPassAdvice(
                lang,
                "no legal combo can beat the current trick",
                "没有能压过当前牌型的组合",
                "Keep the hand intact and wait for a better entry.",
                "保留手牌结构，等下一轮更好的入口。"
            )]
        };
    }

    const context = aiTableContext(seat, g);
    const memo = new Map();
    const baseShape = evaluateHandShape(hand, levelRank, memo);
    const makeEntry = (move) => {
        const remaining = cardsAfterMove(hand, move);
        return {
            move,
            remaining,
            afterShape: evaluateHandShape(remaining, levelRank, memo),
            score: scoreAIMove(move, hand, lastCombo, levelRank, seat, g, context, baseShape, memo)
        };
    };

    const finishing = moves
        .filter(move => remainingAfterMove(hand, move) === 0)
        .map(makeEntry)
        .sort((a, b) => moveStrength(a.move) - moveStrength(b.move));
    if (finishing.length) {
        return {
            signature,
            options: [makeHintMoveAdvice(finishing[0], hand, lastCombo, levelRank, context, baseShape, lang, tr(lang, "Go out", "直接走完"))]
        };
    }

    if (lastCombo && context.lastPlayRelation === "partner") {
        const partnerMove = choosePartnerLeadOverride(moves, hand, lastCombo, levelRank, context);
        if (!partnerMove) {
            return {
                signature,
                options: [makeHintPassAdvice(
                    lang,
                    "partner owns this trick; do not spend cards to beat them",
                    "队友掌握牌权，没必要拆牌去压队友",
                    "Only take over partner's trick when you can finish or almost finish.",
                    "只有能直接走完或接近走完时，才接队友这手。"
                )]
            };
        }
        return {
            signature,
            options: [makeHintMoveAdvice(makeEntry(partnerMove), hand, lastCombo, levelRank, context, baseShape, lang, tr(lang, "Close out", "收尾接手"))]
        };
    }

    const scored = preselectAIMoves(moves, hand, lastCombo, levelRank, context)
        .map(makeEntry)
        .sort((a, b) => a.score - b.score || moveStrength(a.move) - moveStrength(b.move));
    const best = scored[0];
    if (!best) return { signature, options: [] };

    if (lastCombo && shouldDeclineAIMove(best.move, hand, lastCombo, levelRank, context, baseShape, best.score, memo)) {
        return {
            signature,
            options: [
                makeDeclineHintAdvice(best, hand, lastCombo, levelRank, context, baseShape, lang),
                makeHintMoveAdvice(best, hand, lastCombo, levelRank, context, baseShape, lang, tr(lang, "Emergency press", "强压备选"))
            ]
        };
    }

    const options = [];
    const seen = new Set();
    for (const entry of scored) {
        const key = hintMoveKey(entry.move);
        if (seen.has(key)) continue;
        seen.add(key);
        options.push(makeHintMoveAdvice(entry, hand, lastCombo, levelRank, context, baseShape, lang));
        if (options.length >= 3) break;
    }
    return { signature, options };
}

function makeHintSignature(seat, g, hand) {
    const handKey = hand.map(c => c.id).sort().join("-");
    const lastCards = (g?.lastPlay?.cards || []).map(c => c.id).sort().join("-");
    return `${seat}:${g?.roundNo || 0}:${g?.currentTurn ?? ""}:${g?.passCount || 0}:${g?.lastPlay?.player ?? "lead"}:${lastCards}:${handKey}`;
}

function hintMoveKey(move) {
    if (!move) return "pass";
    return `${move.combo.type}:${move.combo.mainPower}:${move.combo.len}:${move.cards.map(c => c.id).sort().join("-")}`;
}

function makeHintPassAdvice(lang, enReason, zhReason, enDetail = "", zhDetail = "") {
    return {
        move: null,
        text: tr(lang, `Suggested pass: ${enReason}`, `建议不要：${zhReason}`),
        detail: tr(lang, enDetail, zhDetail)
    };
}

function makeDeclineHintAdvice(entry, hand, lastCombo, levelRank, context, baseShape, lang) {
    const move = entry.move;
    if (context.lastPlayRelation === "partner") {
        return makeHintPassAdvice(
            lang,
            "partner owns this trick",
            "队友已经在牌权上",
            "Avoid stealing partner tempo unless it ends the hand.",
            "不抢队友节奏，除非这手能收尾。"
        );
    }
    if (move.combo.isBomb && !lastCombo.isBomb && context.pressure < 36) {
        return makeHintPassAdvice(
            lang,
            "bombing now is too expensive",
            "现在炸牌成本太高",
            "Save the bomb for an opponent's close-out or a must-win trick.",
            "炸弹留给对手临门或必须抢回牌权的轮次。"
        );
    }
    if (hintUsesControl(move, levelRank) && context.pressure < 30) {
        return makeHintPassAdvice(
            lang,
            "this press spends control cards before the table is dangerous",
            "这手会过早消耗控制牌",
            "Keep jokers, wild cards, and high cards for real pressure.",
            "大小王、逢人配和高张先留住，等真正高压再接。"
        );
    }
    const afterTurns = entry.afterShape?.plan?.turns ?? 99;
    const baseTurns = baseShape?.plan?.turns ?? 99;
    if (afterTurns > baseTurns) {
        return makeHintPassAdvice(
            lang,
            "forcing a press makes the remaining hand worse",
            "强行压牌会把后续手牌打散",
            "The backup hint shows the best legal press if you must take over.",
            "如果必须接管，可以再点一次提示看强压备选。"
        );
    }
    return makeHintPassAdvice(
        lang,
        "the legal press is not worth the card cost",
        "能压但代价不划算",
        "Pass keeps your structure and waits for a cleaner entry.",
        "不要可以保住结构，等更干净的接牌机会。"
    );
}

function makeHintMoveAdvice(entry, hand, lastCombo, levelRank, context, baseShape, lang, forcedIntent = "") {
    const move = entry.move;
    const combo = move.combo;
    const remaining = entry.remaining || cardsAfterMove(hand, move);
    const afterShape = entry.afterShape || evaluateHandShape(remaining, levelRank);
    const intent = forcedIntent || hintIntentForMove(entry, lastCombo, levelRank, context, baseShape, lang);
    const reasons = hintReasonFragments(entry, lastCombo, levelRank, context, baseShape, lang).slice(0, 2);
    const comboText = comboName(combo, lang);
    const reasonText = reasons.length ? (lang === "zh" ? `，${reasons.join("，")}` : ` - ${reasons.join("; ")}`) : "";
    const text = lang === "zh" ? `${intent}：${comboText}${reasonText}` : `${intent}: ${comboText}${reasonText}`;
    const cardsText = displayCardsForCombo(move.cards, combo, levelRank).map(cardText).join(" ");
    const turns = afterShape?.plan?.turns ?? null;
    const detailParts = [cardsText, tr(lang, `${remaining.length} left`, `出后剩 ${remaining.length} 张`)];
    if (turns != null) detailParts.push(tr(lang, `est. ${turns} turns`, `预计 ${turns} 手`));
    return { move, text, detail: detailParts.join(" · ") };
}

function hintIntentForMove(entry, lastCombo, levelRank, context, baseShape, lang) {
    const move = entry.move;
    const combo = move.combo;
    const remaining = entry.remaining || [];
    if (!remaining.length) return tr(lang, "Go out", "直接走完");
    if (lastCombo) {
        if (context.lastPlayRelation === "partner") return tr(lang, "Close out", "收尾接手");
        if (combo.isBomb && !lastCombo.isBomb) return tr(lang, "Bomb stop", "炸牌截停");
        if (context.partnerPassed) return tr(lang, "Take control", "接管牌权");
        if (context.lastPlayerLeft <= 3 || context.minOpponentLeft <= 3 || context.opponentFirstPartnerLeft <= 3) return tr(lang, "Pressure press", "高压压牌");
        if (context.passesUntilCollect <= 1) return tr(lang, "Win trick", "压住收轮");
        if (combo.mainPower >= 15) return tr(lang, "Control press", "控制压牌");
        return tr(lang, "Low-cost press", "低损耗压牌");
    }
    if (context.partnerLeft === combo.len) return tr(lang, "Feed partner", "送队友");
    if (context.minOpponentLeft === combo.len || (context.nextIsOpponent && context.nextLeft === combo.len)) return tr(lang, "Block outlet", "封对手出口");
    if (context.passMemory?.[combo.type]) return tr(lang, "Attack weakness", "打对手弱项");
    if ((entry.afterShape?.plan?.turns ?? 99) < (baseShape?.plan?.turns ?? 99)) return tr(lang, "Clean shape", "清手牌结构");
    if (["straight", "pairStraight", "tripleStraight", "fullhouse"].includes(combo.type)) return tr(lang, "Lead with shape", "先甩整牌");
    return tr(lang, "Conservative lead", "保控制起手");
}

function hintReasonFragments(entry, lastCombo, levelRank, context, baseShape, lang) {
    const move = entry.move;
    const combo = move.combo;
    const remaining = entry.remaining || [];
    const afterTurns = entry.afterShape?.plan?.turns ?? 99;
    const baseTurns = baseShape?.plan?.turns ?? 99;
    const reasons = [];
    if (!remaining.length) return [tr(lang, "no follow-up needed", "无需后续")];
    if (lastCombo) {
        if (context.partnerPassed) reasons.push(tr(lang, "partner already passed", "队友已不要"));
        if (context.lastPlayerLeft <= 3) reasons.push(tr(lang, `last player has ${context.lastPlayerLeft} left`, `上家只剩 ${context.lastPlayerLeft} 张`));
        if (context.minOpponentLeft <= 3) reasons.push(tr(lang, `opponent is down to ${context.minOpponentLeft}`, `对手最少只剩 ${context.minOpponentLeft} 张`));
        if (context.opponentHasFirst && context.opponentFirstPartnerLeft <= 4) reasons.push(tr(lang, "opponent partner is close", "对家搭档临门"));
        if (context.passesUntilCollect <= 1) reasons.push(tr(lang, "one pass can collect the trick", "再过一家就收轮"));
        if (combo.isBomb) reasons.push(context.pressure >= 34 ? tr(lang, "pressure is high enough", "当前压力足够高") : tr(lang, "spends a bomb", "会消耗炸弹"));
        if (afterTurns < baseTurns) reasons.push(tr(lang, "improves the remaining plan", "后续手数更顺"));
        if (!reasons.length) reasons.push(tr(lang, "beats with the lowest structural cost", "以较低拆牌成本压过"));
        return reasons;
    }
    if (context.partnerLeft === combo.len) reasons.push(tr(lang, `partner has ${context.partnerLeft} left`, `队友正好剩 ${context.partnerLeft} 张`));
    if (context.nextIsPartner && context.partnerLeft <= 2) reasons.push(tr(lang, "partner acts next", "下家就是队友"));
    if (context.minOpponentLeft === combo.len || (context.nextIsOpponent && context.nextLeft === combo.len)) reasons.push(tr(lang, "does not open an easy outlet", "不给对手顺口出口"));
    if (context.passMemory?.[combo.type]) reasons.push(tr(lang, "opponents recently passed this type", "对手近期怕这个牌型"));
    if (afterTurns < baseTurns) reasons.push(tr(lang, `plan drops to ${afterTurns} turns`, `预计压到 ${afterTurns} 手`));
    if (["straight", "pairStraight", "tripleStraight"].includes(combo.type)) reasons.push(tr(lang, "removes a long shape", "先清长牌型"));
    if (!hintUsesControl(move, levelRank)) reasons.push(tr(lang, "keeps control cards", "保留控制牌"));
    return reasons;
}

function hintUsesControl(move, levelRank) {
    if (!move) return false;
    if (move.combo.isBomb) return true;
    return move.cards.some(card => card.joker || isWild(card, levelRank) || (!card.joker && rankPower(card.rank, levelRank) >= 15));
}

function comboStrength(combo) {
    return combo ? combo.mainPower + bombScore(combo) : 0;
}

function moveStrength(move) {
    return move ? comboStrength(move.combo) : 0;
}

function remainingAfterMove(hand, move) {
    if (!move) return hand.length;
    return Math.max(0, hand.length - move.cards.length);
}

export function obviouslyCannotBeat(hand, lastCombo, levelRank) {
    if (!lastCombo) return false;
    if ((hand || []).length < lastCombo.len && (hand || []).length < 4 && !lastCombo.isBomb) return true;
    return !generateAIMoves(hand, lastCombo, levelRank).length;
}

export function findAIMove(hand, lastCombo, levelRank, seat = null, g = null) {
    const moves = generateAIMoves(hand, lastCombo, levelRank);
    if (!moves.length) return null;

    const finishingMoves = moves
        .filter(move => remainingAfterMove(hand, move) === 0)
        .sort((a, b) => moveStrength(a) - moveStrength(b));
    if (finishingMoves.length) return finishingMoves[0];

    const context = aiTableContext(seat, g);
    if (seat != null && lastCombo && context.lastPlayRelation === "partner") {
        return choosePartnerLeadOverride(moves, hand, lastCombo, levelRank, context);
    }

    const memo = new Map();
    const baseShape = evaluateHandShape(hand, levelRank, memo);
    const searchMoves = preselectAIMoves(moves, hand, lastCombo, levelRank, context);
    const scored = searchMoves
        .map(move => ({ move, score: scoreAIMove(move, hand, lastCombo, levelRank, seat, g, context, baseShape, memo) }))
        .sort((a, b) => a.score - b.score || moveStrength(a.move) - moveStrength(b.move));
    const best = scored[0]?.move || null;
    if (shouldDeclineAIMove(best, hand, lastCombo, levelRank, context, baseShape, scored[0]?.score ?? 0, memo)) return null;
    const monteCarloChoice = chooseMonteCarloMove(scored, hand, lastCombo, levelRank, seat, g, context);
    return monteCarloChoice ? monteCarloChoice.move : best;
}

function generateAIMoves(hand, lastCombo, levelRank) {
    const candidates = [];
    const addCandidate = (cards) => {
        if (cards?.length) candidates.push(cards);
    };
    for (const c of hand) addCandidate([c]);

    const naturalByRank = {};
    let wildCount = 0;
    for (const c of hand) {
        if (isWild(c, levelRank)) wildCount++;
        else if (!c.joker) (naturalByRank[c.rank] ||= []).push(c);
    }
    for (const rank of ranks) {
        const maxCount = Math.min(hand.length, (naturalByRank[rank]?.length || 0) + wildCount);
        for (let count = 2; count <= maxCount; count++) addCandidate(pickRankGroup(hand, rank, count, levelRank));
    }

    const jokers = hand.filter(c => c.joker);
    for (const joker of ["BJ", "RJ"]) {
        const pair = jokers.filter(c => c.joker === joker).slice(0, 2);
        if (pair.length === 2) addCandidate(pair);
    }
    if (jokers.length === 4) addCandidate(jokers);

    for (const tripleRank of ranks) {
        for (const pairRank of ranks) {
            if (tripleRank === pairRank) continue;
            const triple = pickRankGroup(hand, tripleRank, 3, levelRank);
            if (!triple) continue;
            const pair = pickRankGroup(hand, pairRank, 2, levelRank, new Set(triple.map(c => c.id)));
            if (pair) addCandidate([...triple, ...pair]);
        }
    }
    for (const seq of sequenceSets("straight")) {
        addCandidate(pickSequence(hand, seq, 1, levelRank));
        for (const flush of pickFlushSequences(hand, seq, levelRank)) addCandidate(flush);
    }
    for (const seq of sequenceSets("pair")) addCandidate(pickSequence(hand, seq, 2, levelRank));
    for (const seq of sequenceSets("plate")) addCandidate(pickSequence(hand, seq, 3, levelRank));

    const seen = new Set();
    const moves = [];
    for (const cards of candidates) {
        const combo = choosePlayable(cards, lastCombo, levelRank);
        if (!combo) continue;
        const key = `${cards.map(c => c.id).sort().join(",")}:${combo.type}:${combo.mainPower}:${combo.bombLen || 0}`;
        if (seen.has(key)) continue;
        seen.add(key);
        moves.push({ cards, combo });
    }
    return moves;
}

function preselectAIMoves(moves, hand, lastCombo, levelRank, context) {
    if (moves.length <= AI_SCORE_MOVE_LIMIT) return moves;
    return moves
        .map(move => ({ move, score: quickAIMoveScore(move, hand, lastCombo, levelRank, context) }))
        .sort((a, b) => a.score - b.score)
        .slice(0, AI_SCORE_MOVE_LIMIT)
        .map(entry => entry.move);
}

function quickAIMoveScore(move, hand, lastCombo, levelRank, context) {
    let score = planMoveCost(move, hand, levelRank) + moveResourcePenalty(move, hand, levelRank) * 0.45;
    if (!lastCombo) {
        score += leadMovePenalty(move, hand, levelRank, context) * 0.75;
        return score;
    }
    score += Math.max(0, comboStrength(move.combo) - comboStrength(lastCombo)) * 0.35;
    if (context.lastPlayRelation === "opponent") score -= context.pressure * 1.6;
    if (move.combo.isBomb && !lastCombo.isBomb) score += Math.max(20, 130 - context.pressure * 3.5);
    score += outletRiskForCombo(move.combo, context) * 0.7;
    score -= partnerFeedValue(move.combo, context) * 0.35;
    score -= pressControlValue(move, lastCombo, context) * 0.45;
    if (context.partnerPassed && context.lastPlayRelation === "opponent") score -= 12;
    return score;
}

function aiTableContext(seat, g) {
    if (seat == null || !g) return { seat, partner: null, lastPlayRelation: "none", pressure: 0, partnerLeft: 99, minOpponentLeft: 99, lastPlayerLeft: 99 };
    const partner = partnerOf(seat);
    const team = seat % 2;
    const finished = finishedList(g);
    const opponents = [0,1,2,3].filter(i => i % 2 !== seat % 2 && !finishedList(g).includes(i));
    const handCount = (i) => finishedList(g).includes(i) ? 0 : (g.hands?.[i] || []).length;
    const lastPlayer = g.lastPlay?.player;
    const lastPlayRelation = lastPlayer == null ? "none" : lastPlayer === partner ? "partner" : lastPlayer % 2 !== seat % 2 ? "opponent" : "self";
    const lastPlayerLeft = lastPlayer == null ? 99 : handCount(lastPlayer);
    const minOpponentLeft = opponents.length ? Math.min(...opponents.map(handCount)) : 99;
    const partnerLeft = handCount(partner);
    const firstFinished = finished[0] ?? null;
    const teamHasFirst = firstFinished != null && firstFinished % 2 === team;
    const opponentHasFirst = firstFinished != null && firstFinished % 2 !== team;
    const partnerFinished = finished.includes(partner);
    const opponentFirstPartner = opponentHasFirst ? partnerOf(firstFinished) : null;
    const opponentFirstPartnerLeft = opponentFirstPartner == null ? 99 : handCount(opponentFirstPartner);
    const trickPasses = [0,1,2,3].filter(i => g.trickPlays?.[i]?.actionType === "pass");
    const partnerPassed = trickPasses.includes(partner);
    const opponentPassCount = trickPasses.filter(i => i % 2 !== team).length;
    const requiredPasses = g.lastPlay
        ? (typeof g.over === "boolean" ? simRequiredPasses(g) : requiredPassesForTrick(g))
        : 0;
    const passCount = Math.max(0, Number(g.passCount) || 0);
    const passesUntilCollect = g.lastPlay ? Math.max(1, requiredPasses - passCount) : 0;
    const passMemory = recentOpponentPassMemory(g, seat);
    let pressure = 0;
    if (lastPlayRelation === "opponent") {
        if (lastPlayerLeft === 0) pressure += 48;
        else if (lastPlayerLeft === 1) pressure += 40;
        else if (lastPlayerLeft === 2) pressure += 30;
        else if (lastPlayerLeft <= 4) pressure += 16;
        else pressure += 5;
    }
    if (minOpponentLeft === 0) pressure += 22;
    else if (minOpponentLeft === 1) pressure += 18;
    else if (minOpponentLeft === 2) pressure += 12;
    if (opponentHasFirst && opponentFirstPartnerLeft <= 2) pressure += 22;
    if (partnerPassed && lastPlayRelation === "opponent") pressure += 10;
    const next = typeof g.over === "boolean" ? simNextSeat(seat, g) : nextSeat(seat, g);
    return {
        seat,
        partner,
        lastPlayRelation,
        pressure,
        partnerLeft,
        minOpponentLeft,
        lastPlayerLeft,
        nextSeat: next,
        teamHasFirst,
        opponentHasFirst,
        partnerFinished,
        partnerPassed,
        opponentPassCount,
        opponentFirstPartnerLeft,
        nextIsPartner: next === partner,
        nextIsOpponent: next != null && next % 2 !== team,
        nextLeft: next == null ? 99 : handCount(next),
        passCount,
        passesUntilCollect,
        passMemory
    };
}

function recentOpponentPassMemory(g, seat) {
    const memory = {};
    let currentCombo = null;
    for (const entry of valuesFromFirebase(g?.history)) {
        if (entry?.actionType === "combo" && entry.combo) {
            currentCombo = entry.combo;
            continue;
        }
        if (entry?.actionType === "pass" && currentCombo && Number(entry.player) % 2 !== seat % 2) {
            const type = currentCombo.type || "";
            if (type && !currentCombo.isBomb) memory[type] = (memory[type] || 0) + 1;
        }
    }
    return memory;
}

function choosePartnerLeadOverride(moves, hand, lastCombo, levelRank, context) {
    const memo = new Map();
    const candidates = moves
        .filter(move => {
            const remaining = remainingAfterMove(hand, move);
            if (remaining === 0) return true;
            if (remaining <= 1 && !move.combo.isBomb) return true;
            if (context.minOpponentLeft <= 1 && remaining <= 2 && !move.combo.isBomb) return true;
            return false;
        })
        .map(move => ({ move, score: evaluateHandShape(cardsAfterMove(hand, move), levelRank, memo).score + moveResourcePenalty(move, hand, levelRank) }))
        .sort((a, b) => a.score - b.score);
    return candidates[0]?.move || null;
}

function scoreAIMove(move, hand, lastCombo, levelRank, seat, g, context, baseShape, memo) {
    const remaining = cardsAfterMove(hand, move);
    const afterShape = evaluateHandShape(remaining, levelRank, memo);
    let score = afterShape.score;
    score += moveResourcePenalty(move, hand, levelRank);
    score += moveShapePenalty(move, lastCombo);
    score += partnershipTempoPenalty(move, remaining, context);

    if (!lastCombo) {
        score += leadMovePenalty(move, hand, levelRank, context);
    } else {
        const overtakeCost = Math.max(0, comboStrength(move.combo) - comboStrength(lastCombo));
        score += overtakeCost * 0.55;
        if (context.lastPlayRelation === "opponent") score -= context.pressure * 2.2;
        if (context.lastPlayRelation === "opponent") score -= pressControlValue(move, lastCombo, context);
        if (context.partnerPassed && context.lastPlayRelation === "opponent") score -= 24;
        if (context.nextIsPartner && context.lastPlayRelation === "opponent" && context.pressure < 28) score += 18;
        if (context.opponentHasFirst && context.lastPlayerLeft <= 3) score -= 20;
        if (context.teamHasFirst && afterShape.plan.turns <= 2) score -= 24;
        if (move.combo.isBomb && !lastCombo.isBomb) score += Math.max(18, 150 - context.pressure * 4);
        if (move.combo.isBomb && lastCombo.isBomb) score += 28;
        if (remaining.length <= 2) score -= 50;
        if (afterShape.plan.turns <= 2) score -= 28;
        if (afterShape.score < baseShape.score - 80) score -= 16;
    }

    return score;
}

function shouldDeclineAIMove(move, hand, lastCombo, levelRank, context, baseShape, bestScore, memo) {
    if (!move || !lastCombo) return false;
    const remaining = cardsAfterMove(hand, move);
    if (!remaining.length || remaining.length <= 2) return false;
    if (context.lastPlayRelation !== "opponent") return false;
    if (shouldForcePress(move, remaining, context)) return false;
    if (context.pressure >= 30) return false;
    if (move.combo.isBomb && !lastCombo.isBomb) return true;
    const burnsControl = move.cards.some(c => c.joker || isWild(c, levelRank));
    const afterShape = evaluateHandShape(remaining, levelRank, memo);
    if (burnsControl && afterShape.plan.turns > 2) return true;
    return bestScore > baseShape.score + 42;
}

function shouldForcePress(move, remaining, context) {
    if (!move || context.lastPlayRelation !== "opponent") return false;
    if (move.combo.isBomb && context.pressure < 36) return false;
    if (context.partnerPassed && !move.combo.isBomb) return true;
    if (context.minOpponentLeft <= 3 && !move.combo.isBomb) return true;
    if (context.opponentHasFirst && context.opponentFirstPartnerLeft <= 4) return true;
    if (context.teamHasFirst && remaining.length <= 5) return true;
    return context.passesUntilCollect <= 1 && context.nextIsOpponent && context.nextLeft <= 5 && !move.combo.isBomb;
}

function pressControlValue(move, lastCombo, context) {
    if (!move || !lastCombo || context.lastPlayRelation !== "opponent") return 0;
    const combo = move.combo;
    let value = 0;
    if (!combo.isBomb && !lastCombo.isBomb) {
        const margin = Math.max(0, comboStrength(combo) - comboStrength(lastCombo));
        value += Math.min(26, margin * 1.6);
        if (combo.mainPower >= 15) value += 14;
        if (combo.mainPower >= 17) value += 10;
        if (margin <= 2 && context.nextIsOpponent) value -= 16;
        if (context.partnerPassed) value += 18;
        if (context.opponentPassCount > 0) value += 10;
        if (context.passesUntilCollect <= 1) value += 12;
        if (context.nextIsOpponent && context.nextLeft <= 4) value += 16;
        if (context.passMemory?.[combo.type]) value += Math.min(18, context.passMemory[combo.type] * 8);
    }
    if (combo.isBomb && !lastCombo.isBomb) {
        value += context.pressure >= 36 ? 42 : -34;
        if (context.opponentHasFirst && context.opponentFirstPartnerLeft <= 3) value += 26;
        if (context.partnerPassed && context.pressure >= 28) value += 16;
    }
    if (combo.isBomb && lastCombo.isBomb) value += context.pressure >= 34 ? 24 : -20;
    return value;
}

function partnershipTempoPenalty(move, remaining, context) {
    let score = 0;
    if (context.partnerFinished || context.teamHasFirst) {
        score -= move.cards.length * 4;
        if (remaining.length <= 4) score -= 18;
        if (move.combo.isBomb && remaining.length > 2) score += 18;
    }
    if (context.opponentHasFirst && context.opponentFirstPartnerLeft <= 2) {
        score -= move.combo.isBomb ? 18 : 8;
        if (remaining.length <= 3) score -= 12;
    }
    return score;
}

function outletRiskForCombo(combo, context) {
    if (!combo) return 0;
    let risk = 0;
    const common = ["single", "pair", "triple", "fullhouse"].includes(combo.type);
    if (context.minOpponentLeft === combo.len) risk += common ? 34 : 18;
    if (context.nextIsOpponent && context.nextLeft === combo.len) risk += common ? 34 : 16;
    if (context.minOpponentLeft === 1 && combo.type === "single") risk += 30;
    if (context.minOpponentLeft === 2 && combo.type === "pair") risk += 26;
    if (context.nextIsOpponent && context.nextLeft === 1 && combo.type === "single") risk += 34;
    if (context.nextIsOpponent && context.nextLeft === 2 && combo.type === "pair") risk += 30;
    return risk;
}

function partnerFeedValue(combo, context) {
    if (!combo) return 0;
    let value = 0;
    if (context.partnerLeft === combo.len) value += ["single", "pair", "triple", "fullhouse"].includes(combo.type) ? 60 : 24;
    if (context.nextIsPartner && context.partnerLeft === combo.len) value += 24;
    if (context.partnerLeft === 1 && combo.type === "single") value += 34;
    if (context.partnerLeft === 2 && combo.type === "pair") value += 30;
    return value;
}

function chooseMonteCarloMove(scored, hand, lastCombo, levelRank, seat, g, context) {
    if (seat == null || !g || !scored.length) return null;
    if (hand.length <= 2) return null;
    if (!lastCombo && hand.length > 20) return null;
    if (context.partnerLeft <= 2 || context.minOpponentLeft <= 2 || context.opponentFirstPartnerLeft <= 2 || context.partnerPassed) return null;
    const start = aiNow();
    const choices = scored.slice(0, AI_MC_TOP_MOVES).map(entry => ({
        move: entry.move,
        heuristicScore: entry.score,
        total: 0,
        visits: 0
    }));
    if (lastCombo && context.lastPlayRelation === "opponent" && context.pressure < 30) {
        choices.push({ move: null, heuristicScore: scored[0].score + 36, total: 0, visits: 0 });
    }
    const limitedChoices = choices.slice(0, AI_MC_MAX_CHOICES);
    if (limitedChoices.length <= 1) return null;
    const hiddenHandSampler = makeHiddenHandSamplerForAI(seat, hand, g);
    if (!hiddenHandSampler) return null;

    let rounds = 0;
    while (rounds < AI_MC_TARGET_VISITS && aiNow() - start < AI_MC_TIME_MS) {
        for (const choice of limitedChoices) {
            if (aiNow() - start >= AI_MC_TIME_MS) break;
            const sampledHands = hiddenHandSampler();
            if (!sampledHands) continue;
            const sim = makeAISimulationState(seat, sampledHands, g);
            if (!applyInitialSimulationChoice(sim, seat, choice.move, levelRank)) continue;
            const value = rolloutSimulation(sim, seat, levelRank, AI_MC_PLAYOUT_DEPTH);
            choice.total += value;
            choice.visits++;
        }
        rounds++;
    }

    const visited = limitedChoices.filter(choice => choice.visits >= AI_MC_MIN_VISITS);
    if (visited.length < 2) return null;
    visited.sort((a, b) => monteCarloChoiceValue(b) - monteCarloChoiceValue(a));
    const best = visited[0];
    const heuristicBest = limitedChoices[0];
    if (best === heuristicBest) return null;
    if (monteCarloChoiceValue(best) < monteCarloChoiceValue(heuristicBest) + 18) return null;
    return { move: best.move };
}

function monteCarloChoiceValue(choice) {
    return (choice.total / Math.max(1, choice.visits)) - choice.heuristicScore * 0.08;
}

function aiNow() {
    return globalThis.performance?.now ? performance.now() : Date.now();
}

function makeOrderedDeck() {
    const deck = [];
    for (let copy = 0; copy < 2; copy++) {
        for (const suit of suits) {
            for (const rank of ranks) deck.push({ id: `${copy}${suit}${rank}`, suit, rank });
        }
        deck.push({ id: `${copy}BJ`, joker: "BJ" });
        deck.push({ id: `${copy}RJ`, joker: "RJ" });
    }
    return deck;
}

function sampleHiddenHandsForAI(seat, hand, g) {
    const sampler = makeHiddenHandSamplerForAI(seat, hand, g);
    return sampler ? sampler() : null;
}

function makeHiddenHandSamplerForAI(seat, hand, g) {
    const knownIds = new Set(hand.map(c => c.id));
    for (const entry of valuesFromFirebase(g.history)) {
        for (const card of valuesFromFirebase(entry?.cards)) knownIds.add(card.id);
    }
    for (const entry of valuesFromFirebase(g.trickPlays)) {
        for (const card of valuesFromFirebase(entry?.cards)) knownIds.add(card.id);
    }
    for (const card of valuesFromFirebase(g.lastPlay?.cards)) knownIds.add(card.id);
    const unknownBase = makeOrderedDeck().filter(card => !knownIds.has(card.id));
    const done = finishedList(g);
    const targetCounts = [0,1,2,3].map(i => {
        if (i === seat) return hand.length;
        return done.includes(i) ? 0 : Math.max(0, (g.hands?.[i] || []).length);
    });
    const needed = targetCounts.reduce((sum, count, i) => i === seat ? sum : sum + count, 0);
    if (needed > unknownBase.length) return null;
    return () => {
        const unknown = shuffleForAI([...unknownBase]);
        const sampled = { 0: [], 1: [], 2: [], 3: [] };
        sampled[seat] = [...hand];
        let cursor = 0;
        for (let i = 0; i < 4; i++) {
            if (i === seat) continue;
            const count = targetCounts[i];
            sampled[i] = unknown.slice(cursor, cursor + count);
            cursor += count;
            if (sampled[i].length !== count) return null;
        }
        return sampled;
    };
}

function shuffleForAI(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

function makeAISimulationState(seat, hands, g) {
    return {
        hands: {
            0: [...(hands[0] || [])],
            1: [...(hands[1] || [])],
            2: [...(hands[2] || [])],
            3: [...(hands[3] || [])]
        },
        currentTurn: seat,
        lastPlay: g.lastPlay ? {
            player: g.lastPlay.player,
            combo: g.lastPlay.combo,
            cards: valuesFromFirebase(g.lastPlay.cards)
        } : null,
        passCount: Math.max(0, Number(g.passCount) || 0),
        finished: [...finishedList(g)],
        seats: [0,1,2,3].map(i => g.seats?.[i] || { type: "ai", team: i % 2 }),
        over: false
    };
}

function applyInitialSimulationChoice(sim, seat, move, levelRank) {
    if (!move) return !!sim.lastPlay && simApplyPass(sim, seat);
    const combo = choosePlayable(move.cards, sim.lastPlay?.combo || null, levelRank);
    if (!combo) return false;
    return simApplyMove(sim, seat, { cards: move.cards, combo }, levelRank);
}

function rolloutSimulation(sim, perspectiveSeat, levelRank, maxDepth) {
    let depth = 0;
    while (!sim.over && depth < maxDepth) {
        const seat = sim.currentTurn;
        if (seat == null || sim.finished.includes(seat)) break;
        const move = chooseRolloutMove(sim, seat, levelRank);
        if (move) simApplyMove(sim, seat, move, levelRank);
        else if (sim.lastPlay) simApplyPass(sim, seat);
        else {
            const fallback = lowestSimulationSingle(sim.hands[seat] || [], levelRank);
            if (!fallback) break;
            simApplyMove(sim, seat, fallback, levelRank);
        }
        depth++;
    }
    return evaluateSimulationState(sim, perspectiveSeat, levelRank);
}

function chooseRolloutMove(sim, seat, levelRank) {
    const hand = sim.hands[seat] || [];
    const lastCombo = sim.lastPlay?.combo || null;
    const moves = generateAIMoves(hand, lastCombo, levelRank);
    if (!moves.length) return null;
    const finishing = moves.find(move => remainingAfterMove(hand, move) === 0);
    if (finishing) return finishing;
    const context = aiTableContext(seat, sim);
    if (lastCombo && context.lastPlayRelation === "partner" && context.minOpponentLeft > 1) return null;
    const scored = moves
        .map(move => ({
            move,
            score: rolloutMoveScore(move, hand, lastCombo, levelRank, context) + Math.random() * 18
        }))
        .sort((a, b) => a.score - b.score);
    const pool = scored.slice(0, Math.min(4, scored.length));
    const pick = Math.random() < 0.72 ? pool[0] : pool[Math.floor(Math.random() * pool.length)];
    if (lastCombo && context.lastPlayRelation === "opponent" && context.pressure < 20 && pick.score > scored[0].score + 30) return null;
    return pick?.move || null;
}

function rolloutMoveScore(move, hand, lastCombo, levelRank, context) {
    let score = quickAIMoveScore(move, hand, lastCombo, levelRank, context);
    const remaining = cardsAfterMove(hand, move);
    score += remaining.length * 4;
    if (remaining.length <= 2) score -= 32;
    if (move.combo.isBomb && hand.length > move.cards.length + 1) score += 48;
    score += outletRiskForCombo(move.combo, context) * 0.5;
    score -= partnerFeedValue(move.combo, context) * 0.45;
    return score;
}

function lowestSimulationSingle(hand, levelRank) {
    const card = sortCards(hand, levelRank)[hand.length - 1];
    const combo = card ? choosePlayable([card], null, levelRank) : null;
    return combo ? { cards: [card], combo } : null;
}

function simApplyMove(sim, seat, move, levelRank) {
    const ids = new Set(move.cards.map(c => c.id));
    const hand = sim.hands[seat] || [];
    if (move.cards.some(card => !hand.some(h => h.id === card.id))) return false;
    sim.hands[seat] = hand.filter(c => !ids.has(c.id));
    sim.lastPlay = { player: seat, cards: move.cards, combo: move.combo };
    sim.passCount = 0;
    if (!sim.hands[seat].length && !sim.finished.includes(seat)) sim.finished.push(seat);
    if (simCheckRoundOver(sim, seat)) return true;
    sim.currentTurn = simNextSeat(seat, sim);
    return true;
}

function simApplyPass(sim, seat) {
    if (!sim.lastPlay) return false;
    sim.passCount = (sim.passCount || 0) + 1;
    if (sim.passCount >= simRequiredPasses(sim)) {
        const winner = sim.lastPlay.player;
        const partner = partnerOf(winner);
        sim.lastPlay = null;
        sim.passCount = 0;
        if (!sim.finished.includes(winner)) sim.currentTurn = winner;
        else if (!sim.finished.includes(partner)) sim.currentTurn = partner;
        else sim.currentTurn = simNextSeat(winner, sim);
    } else {
        sim.currentTurn = simNextSeat(seat, sim);
    }
    return true;
}

function simCheckRoundOver(sim, lastSeat) {
    const first = sim.finished[0];
    if (first != null && sim.finished.includes(partnerOf(first))) {
        for (const i of [0,1,2,3]) if (!sim.finished.includes(i)) sim.finished.push(i);
        sim.over = true;
        return true;
    }
    if (sim.finished.length >= 3) {
        for (const i of [0,1,2,3]) if (!sim.finished.includes(i)) sim.finished.push(i);
        sim.over = true;
        return true;
    }
    return false;
}

function simActiveSeats(sim) {
    return [0,1,2,3].filter(i => sim.seats[i] && !sim.finished.includes(i));
}

function simNextSeat(from, sim) {
    const active = simActiveSeats(sim);
    if (!active.length) return null;
    for (let step = 1; step <= 4; step++) {
        const n = (from - step + 4) % 4;
        if (active.includes(n)) return n;
    }
    return active[0];
}

function simRequiredPasses(sim) {
    if (!sim.lastPlay) return 0;
    return [0,1,2,3].filter(i => i !== sim.lastPlay.player && sim.seats[i] && !sim.finished.includes(i)).length;
}

function evaluateSimulationState(sim, perspectiveSeat, levelRank) {
    const team = perspectiveSeat % 2;
    const partner = partnerOf(perspectiveSeat);
    const order = sim.finished;
    let value = 0;
    for (let place = 0; place < order.length; place++) {
        const player = order[place];
        const placeValue = [520, 260, -80, -220][place] ?? -260;
        value += player % 2 === team ? placeValue : -placeValue;
        if (player === perspectiveSeat) value += [120, 55, -20, -70][place] ?? -80;
        if (player === partner) value += [80, 60, 10, -70][place] ?? -80;
    }
    const ownLeft = (sim.hands[perspectiveSeat] || []).length;
    const partnerLeft = (sim.hands[partner] || []).length;
    const opponentLeft = [0,1,2,3]
        .filter(i => i % 2 !== team)
        .reduce((sum, i) => sum + (sim.hands[i] || []).length, 0);
    value += opponentLeft * 9 - ownLeft * 13 - partnerLeft * 9;
    value += remainingControlValue(sim.hands[perspectiveSeat] || [], levelRank) * 4;
    value += remainingControlValue(sim.hands[partner] || [], levelRank) * 2;
    return value;
}

function remainingControlValue(hand, levelRank) {
    const stats = handShapeStats(hand, levelRank);
    return stats.controlCount * 12 + stats.bombCount * 18 - stats.looseSingles * 4;
}

function leadMovePenalty(move, hand, levelRank, context) {
    const combo = move.combo;
    let score = 0;
    const typePenalty = {
        tripleStraight: -56,
        pairStraight: -48,
        straight: -34,
        fullhouse: -28,
        triple: -10,
        pair: 8,
        single: 28,
        straightFlush: 22,
        bomb: 44,
        jokerBomb: 92
    };
    score += typePenalty[combo.type] ?? 0;
    score -= move.cards.length * 8;
    score += combo.mainPower * 0.6;
    score += outletRiskForCombo(combo, context);
    score -= partnerFeedValue(combo, context);
    score -= Math.min(28, (context.passMemory?.[combo.type] || 0) * 10);
    if (combo.isBomb && hand.length > move.cards.length + 2) score += 90;
    if (context.partnerLeft === 1) {
        score += combo.type === "single" ? -62 : 42;
        if (combo.type === "single") score += context.nextIsPartner ? combo.mainPower * 0.35 : -combo.mainPower * 1.45;
    }
    if (context.partnerLeft === 2) {
        score += combo.type === "pair" ? -58 : 42;
        if (combo.type === "pair") score += context.nextIsPartner ? combo.mainPower * 0.25 : -combo.mainPower * 1.1;
    }
    if (context.minOpponentLeft === 1) score += combo.type === "single" ? 48 : -12;
    if (context.minOpponentLeft === 2) score += combo.type === "pair" ? 38 : -8;
    if (context.partnerFinished || context.teamHasFirst) score -= move.cards.length * 3;
    if (context.opponentHasFirst && context.opponentFirstPartnerLeft <= 2) score -= combo.isBomb ? 16 : 8;
    if (context.nextSeat === context.partner && context.partnerLeft <= 2) score -= 10;
    return score;
}

function moveShapePenalty(move, lastCombo) {
    if (!lastCombo) return 0;
    const combo = move.combo;
    if (combo.type === "single") return 18;
    if (combo.type === "pair") return 8;
    if (["straight", "pairStraight", "tripleStraight", "fullhouse"].includes(combo.type)) return -10;
    return 0;
}

function moveResourcePenalty(move, hand, levelRank) {
    const combo = move.combo;
    const naturalCounts = countRanks(hand.filter(c => !c.joker && !isWild(c, levelRank)));
    let penalty = 0;
    for (const card of move.cards) {
        if (isWild(card, levelRank)) penalty += combo.isBomb ? 10 : 22;
        if (card.joker) penalty += combo.type === "jokerBomb" ? 14 : 30;
        if (!card.joker && !isWild(card, levelRank)) {
            const count = naturalCounts[card.rank] || 0;
            if (count >= 4 && combo.type !== "bomb") penalty += 22;
            else if (count === 3 && !["triple", "fullhouse", "tripleStraight", "bomb"].includes(combo.type)) penalty += 10;
            else if (count === 2 && combo.type === "single") penalty += 8;
        }
    }
    if (combo.isBomb) {
        if (combo.type === "jokerBomb") penalty += 120;
        else if (combo.type === "straightFlush") penalty += 82;
        else penalty += 34 + Math.max(0, (combo.bombLen || 4) - 4) * 7;
    }
    return penalty;
}

function evaluateHandShape(cards, levelRank, memo = new Map()) {
    const key = `shape:${levelRank}:${cards.map(c => c.id).sort().join(",")}`;
    if (memo.has(key)) return memo.get(key);
    const plan = estimateHandPlan(cards, levelRank, memo);
    const stats = handShapeStats(cards, levelRank);
    const score = plan.turns * 120
        + plan.quality
        + stats.looseSingles * 18
        + stats.highLooseSingles * 9
        + stats.wildCount * 4
        - stats.bombCount * 22
        - stats.controlCount * 10;
    const result = { score, plan, stats };
    memo.set(key, result);
    return result;
}

function estimateHandPlan(cards, levelRank, memo = new Map()) {
    const key = `plan:${levelRank}:${cards.map(c => c.id).sort().join(",")}`;
    if (memo.has(key)) return memo.get(key);
    if (!cards.length) {
        const empty = { turns: 0, quality: 0, singles: 0 };
        memo.set(key, empty);
        return empty;
    }
    if (cards.length > AI_PLAN_SEARCH_LIMIT) {
        const greedy = greedyHandPlan(cards, levelRank);
        memo.set(key, greedy);
        return greedy;
    }
    const moves = generateAIMoves(cards, null, levelRank)
        .sort((a, b) => planMoveCost(a, cards, levelRank) - planMoveCost(b, cards, levelRank))
        .slice(0, AI_PLAN_BRANCH_LIMIT);
    let best = { turns: cards.length, quality: cards.length * 45, singles: cards.length };
    for (const move of moves) {
        const rest = estimateHandPlan(cardsAfterMove(cards, move), levelRank, memo);
        const candidate = {
            turns: rest.turns + 1,
            quality: rest.quality + planMoveCost(move, cards, levelRank),
            singles: rest.singles + (move.combo.type === "single" ? 1 : 0)
        };
        if (candidate.turns < best.turns || (candidate.turns === best.turns && candidate.quality < best.quality)) best = candidate;
    }
    memo.set(key, best);
    return best;
}

function greedyHandPlan(cards, levelRank) {
    let remaining = [...cards];
    let turns = 0;
    let quality = 0;
    let singles = 0;
    const seen = new Set();
    while (remaining.length && turns < AI_GREEDY_PLAN_LIMIT) {
        const stateKey = remaining.map(c => c.id).sort().join(",");
        if (seen.has(stateKey)) break;
        seen.add(stateKey);
        const move = generateAIMoves(remaining, null, levelRank)
            .sort((a, b) => planMoveCost(a, remaining, levelRank) - planMoveCost(b, remaining, levelRank))[0];
        if (!move) break;
        quality += planMoveCost(move, remaining, levelRank);
        singles += move.combo.type === "single" ? 1 : 0;
        turns++;
        remaining = cardsAfterMove(remaining, move);
    }
    if (remaining.length) {
        turns += remaining.length;
        quality += remaining.length * 45;
        singles += remaining.length;
    }
    return { turns, quality, singles };
}

function planMoveCost(move, hand, levelRank) {
    const combo = move.combo;
    const typeCost = {
        tripleStraight: -34,
        pairStraight: -30,
        straight: -22,
        fullhouse: -18,
        triple: -6,
        pair: 10,
        single: 38,
        straightFlush: 18,
        bomb: 28,
        jokerBomb: 80
    };
    let cost = typeCost[combo.type] ?? 0;
    cost -= move.cards.length * 6;
    cost += combo.mainPower * 0.75;
    cost += move.cards.filter(c => isWild(c, levelRank)).length * 9;
    cost += move.cards.filter(c => c.joker).length * 10;
    if (combo.isBomb && hand.length > move.cards.length) cost += 34;
    return cost;
}

function handShapeStats(cards, levelRank) {
    const natural = cards.filter(c => !c.joker && !isWild(c, levelRank));
    const counts = countRanks(natural);
    const looseSingles = Object.keys(counts).filter(rank => counts[rank] === 1).length;
    const highLooseSingles = Object.keys(counts).filter(rank => counts[rank] === 1 && rankPower(rank, levelRank) >= 13).length;
    const bombCount = Object.keys(counts).filter(rank => counts[rank] >= 4).length + (cards.filter(c => c.joker).length === 4 ? 1 : 0);
    const controlCount = cards.filter(c => c.joker || (!isWild(c, levelRank) && !c.joker && rankPower(c.rank, levelRank) >= 15)).length + bombCount;
    const wildCount = cards.filter(c => isWild(c, levelRank)).length;
    return { looseSingles, highLooseSingles, bombCount, controlCount, wildCount };
}

function cardsAfterMove(hand, move) {
    const used = new Set(move?.cards?.map(c => c.id) || []);
    return hand.filter(c => !used.has(c.id));
}

function pickRankGroup(hand, rank, count, levelRank, used = new Set()) {
    const picked = hand
        .filter(c => !used.has(c.id) && !c.joker && !isWild(c, levelRank) && c.rank === rank)
        .slice(0, count);
    if (picked.length < count) {
        const wilds = hand
            .filter(c => !used.has(c.id) && !picked.some(p => p.id === c.id) && isWild(c, levelRank))
            .slice(0, count - picked.length);
        picked.push(...wilds);
    }
    return picked.length === count ? picked : null;
}

function pickSequence(hand, seq, each, levelRank) {
    const picked = [];
    const used = new Set();
    for (const rank of seq) {
        const cards = hand.filter(c => !used.has(c.id) && !c.joker && !isWild(c, levelRank) && c.rank === rank).slice(0, each);
        picked.push(...cards);
        cards.forEach(c => used.add(c.id));
        const miss = each - cards.length;
        if (miss > 0) {
            const wilds = hand.filter(c => !used.has(c.id) && isWild(c, levelRank)).slice(0, miss);
            if (wilds.length < miss) return null;
            picked.push(...wilds);
            wilds.forEach(c => used.add(c.id));
        }
    }
    return picked.length === seq.length * each ? picked : null;
}

function pickFlushSequence(hand, seq, levelRank) {
    return pickFlushSequences(hand, seq, levelRank)[0] || null;
}

function pickFlushSequences(hand, seq, levelRank) {
    const matches = [];
    for (const suit of suits) {
        const picked = [];
        const used = new Set();
        for (const rank of seq) {
            let card = hand.find(c => !used.has(c.id) && !c.joker && !isWild(c, levelRank) && c.rank === rank && c.suit === suit);
            if (!card) card = hand.find(c => !used.has(c.id) && isWild(c, levelRank));
            if (!card) { picked.length = 0; break; }
            picked.push(card); used.add(card.id);
        }
        if (picked.length === 5) matches.push(picked);
    }
    return matches;
}

export function displayCardsForCombo(cards = [], combo = null, levelRank = "2") {
    const sorted = sortCards(cards, levelRank);
    if (combo?.displayOrder?.length) {
        const byId = new Map(cards.map(c => [c.id, c]));
        return combo.displayOrder
            .map(item => byId.get(item.id))
            .filter(Boolean);
    }
    if (!combo || !["straight", "straightFlush", "pairStraight", "tripleStraight"].includes(combo.type)) return sorted;
    const counts = countRanks(cards.filter(c => !c.joker));
    const seq = Object.keys(counts).sort((a, b) => rankBase(a) - rankBase(b));
    if (seq.length) {
        return [...cards].sort((a, b) => {
            const ra = a.rank ? seq.indexOf(a.rank) : 999;
            const rb = b.rank ? seq.indexOf(b.rank) : 999;
            if (ra !== rb) return ra - rb;
            return suits.indexOf(a.suit || "S") - suits.indexOf(b.suit || "S") || a.id.localeCompare(b.id);
        });
    }
    return sorted;
}

// ---------------------------------------------------------------------------------------------
// Worker protocol + main-thread client
// ---------------------------------------------------------------------------------------------

const ENGINE_TASKS = {
    aiMove: (a) => findAIMove(a.hand, a.lastCombo, a.levelRank, a.seat, a.g),
    hint: (a) => buildPlayerHintPackage(a.seat, a.g, a.lang)
};

export function runEngineTask(kind, args) {
    const task = ENGINE_TASKS[kind];
    if (!task) throw new Error(`Unknown engine task: ${kind}`);
    return task(args || {});
}

// Runs engine tasks in a module worker, one worker per task kind so a slow 提示 never delays an AI
// turn. Only the newest request of a kind matters (callers drop stale results), so issuing a new one
// cancels the pending one by restarting that worker; its promise rejects with `err.cancelled`.
// If the worker can't start, crashes, or times out, the request runs on the main thread instead
// (same code, same result) and repeated failures switch the worker off for the session.
// The timeouts only catch a dead worker: a single search legitimately takes up to ~18 s on a
// desktop (15-18 card leads), several times that on a phone.
export function createEngineClient(workerUrl, options = {}) {
    const timeouts = { aiMove: 90000, hint: 90000, ...(options.timeouts || {}) };
    const maxFailures = options.maxFailures ?? 2;
    const lanes = {};
    let disabled = !workerUrl || typeof Worker === "undefined";
    let failures = 0;
    let nextId = 1;

    function runSync(req) {
        try {
            req.resolve(runEngineTask(req.kind, req.args));
        } catch (err) {
            req.reject(err);
        }
    }

    function closeLane(lane) {
        if (lanes[lane.kind] === lane) delete lanes[lane.kind];
        for (const req of lane.pending.values()) clearTimeout(req.timer);
        try { lane.worker.terminate(); } catch (_) {}
    }

    function failLane(lane, reason) {
        if (lanes[lane.kind] !== lane) return;
        failures++;
        if (!lane.ready || failures >= maxFailures) disabled = true;
        console.warn(`[guandan-engine] worker ${reason}; running ${lane.kind} on the main thread${disabled ? " from now on" : ""}.`);
        const closing = disabled ? Object.values(lanes) : [lane];
        const pending = closing.flatMap(l => [...l.pending.values()]);
        closing.forEach(closeLane);
        pending.forEach(runSync);
    }

    function openLane(kind) {
        if (disabled) return null;
        if (lanes[kind]) return lanes[kind];
        let worker;
        try {
            worker = new Worker(workerUrl, { type: "module" });
        } catch (err) {
            disabled = true;
            console.warn("[guandan-engine] worker unavailable; using the main-thread engine.", err);
            return null;
        }
        const lane = { kind, worker, pending: new Map(), ready: false };
        worker.addEventListener("message", (event) => {
            const data = event.data || {};
            lane.ready = true;
            const req = lane.pending.get(data.id);
            if (!req) return;
            lane.pending.delete(data.id);
            clearTimeout(req.timer);
            if (data.ok) {
                failures = 0;
                req.resolve(data.result);
            } else {
                console.warn(`[guandan-engine] worker ${req.kind} failed; retrying on the main thread.`, data.error);
                runSync(req);
            }
        });
        worker.addEventListener("error", (event) => {
            event.preventDefault?.();
            failLane(lane, lane.ready ? "crashed" : "failed to start");
        });
        worker.addEventListener("messageerror", () => failLane(lane, "sent an unreadable message"));
        lanes[kind] = lane;
        return lane;
    }

    function cancelPending(kind) {
        const lane = lanes[kind];
        if (!lane || !lane.pending.size) return;
        const pending = [...lane.pending.values()];
        closeLane(lane);
        for (const req of pending) {
            const err = new Error(`${kind} request superseded`);
            err.cancelled = true;
            req.reject(err);
        }
    }

    function run(kind, args) {
        return new Promise((resolve, reject) => {
            const req = { id: nextId++, kind, args, resolve, reject, timer: 0 };
            cancelPending(kind);
            const lane = openLane(kind);
            if (!lane) {
                runSync(req);
                return;
            }
            lane.pending.set(req.id, req);
            req.timer = setTimeout(() => failLane(lane, `timed out after ${timeouts[kind]} ms`), timeouts[kind] ?? 30000);
            try {
                lane.worker.postMessage({ id: req.id, kind, args });
            } catch (err) {
                lane.pending.delete(req.id);
                clearTimeout(req.timer);
                runSync(req);
            }
        });
    }

    return {
        run,
        findAIMove: (hand, lastCombo, levelRank, seat, g) => run("aiMove", { hand, lastCombo, levelRank, seat, g }),
        buildPlayerHintPackage: (seat, g, lang) => run("hint", { seat, g, lang }),
        get usingWorker() { return !disabled; }
    };
}
