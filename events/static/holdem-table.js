// The Hold'em table (htable): a design-px stage like Guandan's (landscape 1280 x 720, portrait phones 720 x 1280 with
// their own layout, never rotated), the oval table with 2-9 seats around it and the hero at the bottom centre, the
// board and pots, bets in front of the seats, Guandan's alarm-clock timer, the action pills with the raise panel and
// the pre-action toggles, and the motion of a hand (deal, bets, collect, showdown, chips to the winners) in
// transform / opacity only. Every region is rewritten only when its markup changes.
import { toCard, fmt, short, catName, handCat, handLabel, seatName, botMark, actionName } from "https://yil384.github.io/Picasso-Lab/events/static/holdem-common.js";

const LAND = { w: 1280, h: 720 };
const PORT = { w: 720, h: 1280 };
// seat angles (degrees, screen coordinates: 90 = bottom, the hero; increasing = clockwise = the order of play)
const ANGLES = {
    land: { 2: [90, 270], 3: [90, 210, 330], 4: [90, 180, 270, 0], 5: [90, 160, 230, 310, 20], 6: [90, 150, 210, 270, 330, 30],
        7: [90, 145, 195, 245, 295, 345, 35], 8: [90, 145, 180, 215, 270, 325, 0, 35], 9: [90, 145, 180, 215, 250, 290, 325, 0, 35] },
    port: { 2: [90, 270], 3: [90, 215, 325], 4: [90, 180, 270, 0], 5: [90, 160, 230, 310, 20], 6: [90, 150, 210, 270, 330, 30],
        7: [90, 145, 190, 240, 300, 350, 35], 8: [90, 140, 180, 225, 270, 315, 0, 40], 9: [90, 135, 165, 200, 250, 290, 340, 15, 45] }
};
const LABEL_MS = 1500;
// a chip seen from above: the denomination colour (currentColor), six white edge inserts, a dashed inner ring
const CHIP_DEFS = `<svg class="gd-defs" aria-hidden="true" focusable="false"><symbol id="hd-sym-chip" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="19" fill="currentColor"/>
    <g fill="#fff">${[0, 60, 120, 180, 240, 300].map(a => `<rect x="17" y="1.2" width="6" height="6.5" rx="1.4" transform="rotate(${a} 20 20)"/>`).join("")}</g>
    <circle cx="20" cy="20" r="18.2" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/>
    <circle cx="20" cy="20" r="11.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3.2 2.3"/>
    <circle cx="20" cy="20" r="9.4" fill="#fff" fill-opacity=".16"/>
</symbol></svg>`;
const BIG_POT_BB = 50;
const TICK_MS = 250;
const PICASSO = "picasso";

// Two-tone glyphs in the style of Guandan's table icons (32 x 32).
const ICONS = {
    last: `<rect x="9" y="5" width="17" height="23" rx="3" fill="#cfe7e3"/><rect x="5" y="7" width="17" height="23" rx="3" fill="#fff"/><path fill="#0b6b62" d="M9 18.5 14.5 13v3.4h6.5v4.2h-6.5V24Z"/>`,
    hands: `<rect x="3.5" y="8" width="14" height="19" rx="2.5" fill="#cfe7e3" transform="rotate(-14 10 17)"/><rect x="11" y="5" width="15" height="21" rx="2.5" fill="#fff"/><path fill="#0b6b62" d="M18.5 9.5c-.6 2.6-4.5 4.6-4.5 7.4 0 1.7 1.3 2.8 2.8 2.8.7 0 1.3-.2 1.7-.6l-.9 3.4h1.8l-.9-3.4c.4.4 1 .6 1.7.6 1.5 0 2.8-1.1 2.8-2.8 0-2.8-3.9-4.8-4.5-7.4Z"/>`,
    chips: `<ellipse cx="16" cy="22" rx="11" ry="5" fill="#cfe7e3"/><ellipse cx="16" cy="17" rx="11" ry="5" fill="#fff"/><ellipse cx="16" cy="12" rx="11" ry="5" fill="#ffd66b"/><ellipse cx="16" cy="12" rx="5" ry="2.2" fill="#b8660c"/>`,
    pause: `<circle cx="16" cy="16" r="13" fill="#fff"/><path fill="#0b6b62" d="M11.5 10h3.4v12h-3.4zm5.6 0h3.4v12h-3.4z"/>`,
    play: `<circle cx="16" cy="16" r="13" fill="#fff"/><path fill="#0b6b62" d="M12.5 9.8 22.5 16l-10 6.2Z"/>`,
    stand: `<circle cx="13" cy="9" r="5" fill="#fff"/><path fill="#fff" d="M5 28c0-6 3.6-10 8-10s8 4 8 10Z"/><path fill="#ffd66b" d="M21 13.5h7v3h-7z"/>`
};

export function createTable({ ui, S, send, popups }) {
    const { L, encodeHTML: esc } = ui;
    const icon = name => (ICONS[name]
        ? `<svg class="gd-ico" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`
        : ui.tableIcon(name));
    const V = {
        n: 0, portrait: false, s: 1, w: LAND.w, h: LAND.h, left: 0, top: 0, G: null,
        html: new Map(), seats: [], bets: [],
        menuOpen: false, raise: null, pre: null,
        labels: new Map(), shownWin: "", dealt: "", collected: "", lastAct: new Map(),
        stale: false, busy: false, timer: 0, frame: 0, destroyed: false, keys: ""
    };
    const reduced = () => ui.prefersReducedMotion();

    ui.root.innerHTML = `<div class="hd-viewport">
        <i class="gd-safe-probe" aria-hidden="true"></i>
        <div class="hd-stage">
            ${ui.tableDefsHTML}${CHIP_DEFS}
            <div class="hd-felt" aria-hidden="true"><div class="hd-felt-in"></div><div class="hd-mark" data-r="mark"></div></div>
            <div class="hd-pots" data-r="pots"></div>
            <div class="hd-board" data-r="board"></div>
            <div class="hd-seats"></div>
            <div class="hd-bets"></div>
            <div class="hd-dealer" aria-label="${L("Dealer", "庄家")}">D</div>
            <div class="hd-hero" data-r="hero"></div>
            <div class="hd-mine" data-r="mine"></div>
            <div class="hd-word" data-r="word"></div>
            <div class="hd-raise" data-r="raise"></div>
            <div class="hd-actions" data-r="actions"></div>
            <div class="hd-hud" data-r="hud"></div>
            <div class="hd-hud-right" data-r="hudRight"></div>
            <div class="hd-status" data-r="status" role="status" aria-live="polite"></div>
            <div class="gd-fx-host hd-fx" aria-hidden="true"></div>
            <div class="gd-menu-host" data-r="menu"></div>
        </div>
    </div>`;
    const viewport = ui.root.querySelector(".hd-viewport");
    const stage = viewport.querySelector(".hd-stage");
    const probe = viewport.querySelector(".gd-safe-probe");
    const fx = stage.querySelector(".hd-fx");
    const dealer = stage.querySelector(".hd-dealer");
    const R = {};
    stage.querySelectorAll("[data-r]").forEach(el => { R[el.dataset.r] = el; });

    // ---------- regions ----------
    function put(el, html) {
        if (!el || V.html.get(el) === html) return false;
        V.html.set(el, html);
        el.innerHTML = html;
        return true;
    }
    function region(name, html) {
        return put(R[name], html);
    }

    // ---------- stage layout ----------
    function layout() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const portrait = vw < vh;
        const cs = getComputedStyle(probe);
        const il = parseFloat(cs.paddingLeft) || 0;
        const ir = parseFloat(cs.paddingRight) || 0;
        const it = parseFloat(cs.paddingTop) || 0;
        const ib = parseFloat(cs.paddingBottom) || 0;
        const D = portrait ? PORT : LAND;
        const aw = Math.max(1, vw - il - ir);
        const ah = Math.max(1, vh - it - ib);
        const s = Math.min(aw / D.w, ah / D.h);
        V.s = s;
        V.w = aw / s;
        V.h = ah / s;
        V.left = il;
        V.top = it;
        V.portrait = portrait;
        stage.style.width = `${V.w}px`;
        stage.style.height = `${V.h}px`;
        stage.style.transform = `translate(${il}px, ${it}px) scale(${s})`;
        stage.style.setProperty("--hd-s", s.toFixed(4));
        stage.style.setProperty("--gd-s", s.toFixed(4));
        viewport.classList.toggle("is-portrait", portrait);
    }

    // How far from the centre a ray at (cos, sin) leaves the table: a stadium (a rectangle with round ends)
    // of half sizes a x b, like a real card table.
    function edge(a, b, cos, sin) {
        const r = Math.min(a, b);
        const inside = (x, y) => {
            const dx = Math.abs(x) - (a - r);
            const dy = Math.abs(y) - (b - r);
            return Math.abs(x) <= a && Math.abs(y) <= b && (dx <= 0 || dy <= 0 || dx * dx + dy * dy <= r * r);
        };
        let lo = 0;
        let hi = a + b;
        for (let i = 0; i < 24; i++) {
            const m = (lo + hi) / 2;
            if (inside(m * cos, m * sin)) lo = m;
            else hi = m;
        }
        return lo;
    }

    // Table and seat anchors in design px, from the stage size and the seat count.
    function geometry() {
        const { w, h, portrait } = V;
        const n = V.n;
        const cx = w / 2;
        let cy, rx, ry, heroY;
        if (portrait) {
            rx = Math.min(w * .42, 330);
            heroY = h - 336;
            cy = h * .45;
            ry = Math.min(heroY - 40 - cy, 600);
        } else {
            rx = Math.min(w * .37, 600);
            cy = h * .46;
            ry = Math.min(h * .36, rx * .62);
            heroY = h - 92;
        }
        const angles = (portrait ? ANGLES.port : ANGLES.land)[n] || ANGLES.land[6];
        const margin = portrait ? 60 : 56;
        const seats = angles.map((deg, k) => {
            const a = deg * Math.PI / 180;
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            const out = edge(rx + 8, ry + 10, cos, sin);
            const inner = edge(rx, ry, cos, sin) * ((portrait ? .6 : .66) - .1 * Math.abs(sin));
            let x = cx + out * cos;
            let y = cy + out * sin;
            if (k === 0) {
                x = cx;
                y = heroY;
            }
            x = Math.min(w - margin, Math.max(margin, x));
            y = Math.max(portrait ? 168 : 78, y);
            const side = k === 0 ? "bottom" : Math.abs(cos) < .35 ? (sin < 0 ? "top" : "bottom") : cos < 0 ? "left" : "right";
            // bets sit on an inner ring toward the centre; the hero's bet over the hole cards
            const bx = k === 0 ? cx : cx + inner * cos;
            const by = k === 0 ? heroY - (portrait ? 270 : 220) : cy + inner * sin;
            return { x, y, side, bx, by, cos, sin };
        });
        return { cx, cy, rx, ry, heroY, seats, boardY: cy + (portrait ? 6 : 4) };
    }

    function stagePoint(r) {
        return { x: (r.left + r.width / 2 - V.left) / V.s, y: (r.top + r.height / 2 - V.top) / V.s };
    }

    // ---------- the build (once per seat count / orientation) ----------
    function build() {
        V.G = geometry();
        const G = V.G;
        stage.classList.toggle("is-portrait", V.portrait);
        stage.style.setProperty("--cx", `${G.cx}px`);
        stage.style.setProperty("--cy", `${G.cy}px`);
        stage.style.setProperty("--rx", `${G.rx}px`);
        stage.style.setProperty("--ry", `${G.ry}px`);
        stage.style.setProperty("--board-y", `${G.boardY}px`);
        stage.style.setProperty("--hero-y", `${G.heroY}px`);
        const seatsEl = stage.querySelector(".hd-seats");
        const betsEl = stage.querySelector(".hd-bets");
        seatsEl.innerHTML = "";
        betsEl.innerHTML = "";
        V.seats = [];
        V.bets = [];
        for (let k = 0; k < V.n; k++) {
            const p = G.seats[k];
            const el = document.createElement("div");
            el.className = `hd-seat is-${p.side}${k === 0 ? " is-hero" : ""}`;
            el.style.left = `${p.x.toFixed(1)}px`;
            el.style.top = `${p.y.toFixed(1)}px`;
            el.innerHTML = `<div class="hd-seat-body"></div><div class="hd-holes"></div><div class="hd-clockslot"></div><div class="hd-label"></div><div class="hd-won"></div>`;
            seatsEl.appendChild(el);
            V.seats.push({ el, body: el.children[0], holes: el.children[1], clock: el.children[2], label: el.children[3], won: el.children[4] });
            const bet = document.createElement("div");
            bet.className = `hd-bet is-${p.side}`;
            bet.style.left = `${p.bx.toFixed(1)}px`;
            bet.style.top = `${p.by.toFixed(1)}px`;
            betsEl.appendChild(bet);
            V.bets.push(bet);
        }
        V.html.clear();
        V.keys = "";
    }

    // visual slot k (0 = bottom) <-> seat index
    function anchorSeat() {
        return S.me?.seat ?? 0;
    }
    function slotOf(i) {
        return (i - anchorSeat() + V.n) % V.n;
    }
    function seatAt(k) {
        return (k + anchorSeat()) % V.n;
    }

    // ---------- pieces ----------
    function faceHTML(seat) {
        if (seat.bot) return ui.defaultFaceHTML(botMark(seat, L));
        const photo = ui.seatMemberPhoto(seat.name);
        return photo ? `<img src="${esc(photo)}" alt="" draggable="false">` : ui.defaultFaceHTML();
    }

    function card(code, id, cls = "", small = true) {
        return ui.cardHTML(toCard(code, id), small, cls);
    }

    function chipColor(amt, bb) {
        const k = amt / bb;
        return k >= 50 ? "c4" : k >= 15 ? "c3" : k >= 5 ? "c2" : k >= 1 ? "c1" : "c0";
    }

    function chipHTML(c, k = 0) {
        return `<svg class="hd-chip ${c}" viewBox="0 0 40 40" style="--k:${k}" aria-hidden="true"><use href="#hd-sym-chip"/></svg>`;
    }

    function chipsHTML(amt, bb, n) {
        const c = chipColor(amt, bb);
        return `<span class="hd-chipstack">${Array.from({ length: n }, (_, i) => chipHTML(i === n - 1 ? c : chipColor(amt / 3, bb), i)).join("")}</span>`;
    }

    function betHTML(amt, bb) {
        if (!amt) return "";
        const n = amt >= bb * 8 ? 3 : amt >= bb * 2 ? 2 : 1;
        return `${chipsHTML(amt, bb, n)}<b>${short(amt)}</b>`;
    }

    function remaining() {
        const h = S.table?.hand;
        if (!h?.deadline) return 0;
        return Math.max(0, Math.ceil((h.deadline - (Date.now() + S.offset)) / 1000));
    }

    function clockHTML(bank) {
        return `<div class="gd-clock hd-clock${bank ? " is-bank" : ""}" data-clock><svg viewBox="0 0 100 106" aria-hidden="true"><use href="#gd-sym-clock"/></svg><b>${remaining()}</b>${bank ? `<span class="hd-bank">${L("Time bank", "时间银行")}</span>` : ""}</div>`;
    }

    function stateTag(seat) {
        if (!seat.connected && !seat.bot) return `<span class="hd-tag is-off">${L("Offline", "离线")}</span>`;
        if (seat.state === "allin") return `<span class="hd-tag is-allin">${L("All-in", "全下")}</span>`;
        if (seat.state === "out") return `<span class="hd-tag is-grey">${L("Away", "暂离")}</span>`;
        if (seat.state === "waiting") return `<span class="hd-tag is-grey">${L("Next hand", "等待")}</span>`;
        if (seat.state === "busted") return `<span class="hd-tag is-grey">${L("Rebuying", "补码中")}</span>`;
        return "";
    }

    // ---------- render ----------
    function update(prev) {
        const t = S.table;
        if (!t) return;
        if (S.status === "online") V.stale = false;
        const n = t.settings.seats;
        const shape = `${n}:${V.portrait}:${Math.round(V.w)}:${Math.round(V.h)}:${anchorSeat()}`;
        if (shape !== V.keys) {
            V.n = n;
            build();
            V.keys = shape;
            prev = { table: null, me: null };
        }
        const h = t.hand;
        const me = S.me;
        const mine = me?.seat ?? null;
        const bb = t.settings.bb;
        const winners = h?.winners || null;
        const winCards = new Set(winners?.flatMap(w => w.hand?.cards || []) || []);
        const showdown = !!winners && winCards.size > 0;
        stage.classList.toggle("is-showdown", showdown);
        stage.classList.toggle("has-board", !!h?.board.length);

        region("mark", `<b>PICASSO ${L("Hold'em", "德州")}</b><span>${L(`Blinds ${t.settings.sb}/${bb}`, `盲注 ${t.settings.sb}/${bb}`)}${h?.no ? ` · ${L(`Hand ${h.no}`, `第 ${h.no} 手`)}` : ""}</span>`);
        renderHud();

        // seats
        for (let k = 0; k < V.n; k++) {
            const i = seatAt(k);
            renderSeat(i, k, t.seats[i], { mine, h, winners, winCards, showdown, bb });
        }
        // bets and the dealer button
        for (let k = 0; k < V.n; k++) {
            const seat = t.seats[seatAt(k)];
            put(V.bets[k], seat && seat.bet ? betHTML(seat.bet, bb) : "");
        }
        if (h && h.button != null && t.seats[h.button]) {
            // on the felt just past the button seat's plate, beside its bet: below it on the sides, left of
            // it at the top, right of my cards
            const k = slotOf(h.button);
            const p = V.G.seats[k];
            const dx = (V.G.cx - p.x) / (Math.hypot(V.G.cx - p.x, V.G.boardY - p.y) || 1);
            const dy = (V.G.boardY - p.y) / (Math.hypot(V.G.cx - p.x, V.G.boardY - p.y) || 1);
            let px = -dy;
            let py = dx;
            if (k === 0 ? px < 0 : py < 0 || (Math.abs(py) < .01 && px > 0)) {
                px = -px;
                py = -py;
            }
            const x = p.x + dx * 108 + px * 84;
            const y = p.y + dy * 108 + py * 84;
            dealer.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            dealer.classList.add("is-on");
        } else {
            dealer.classList.remove("is-on");
        }

        // board and pots
        renderBoard(h, winCards, showdown);
        renderPots(h, t);
        renderHero(t, me, h, winCards, showdown);
        renderMine(t, me);
        renderActions(t, me, h);
        renderWord(h, winners);
        region("menu", menuHTML());
        region("status", V.stale || S.status !== "online" ? `<span>${L("Reconnecting…", "重新连接中…")}</span>` : "");
        stage.classList.toggle("is-stale", V.stale || S.status !== "online");

        animate(prev);
        tick();
        clearInterval(V.timer);
        if (h && !h.done && h.toAct != null) V.timer = setInterval(tick, TICK_MS);
    }

    function renderSeat(i, k, seat, ctx) {
        const v = V.seats[k];
        const { mine, h, winners, winCards, showdown } = ctx;
        const me = i === mine;
        const toAct = !!h && !h.done && h.toAct === i;
        v.el.classList.toggle("is-empty", !seat);
        v.el.classList.toggle("is-me", me);
        v.el.classList.toggle("is-turn", toAct);
        v.el.classList.toggle("is-folded", seat?.state === "folded");
        v.el.classList.toggle("is-out", !!seat && (seat.state === "out" || seat.state === "busted" || seat.state === "waiting"));
        const won = winners?.filter(w => w.seat === i).reduce((a, w) => a + w.amt, 0) || 0;
        v.el.classList.toggle("is-winner", won > 0);
        if (!seat) {
            put(v.body, mine == null
                ? `<button class="hd-sit" type="button" data-sit="${i}" aria-label="${L(`Sit at seat ${i + 1}`, `坐 ${i + 1} 号位`)}"><b>+</b><span>${L("Sit", "入座")}</span></button>`
                : `<span class="hd-empty" aria-hidden="true"></span>`);
            put(v.holes, "");
            put(v.clock, "");
            put(v.won, "");
            return;
        }
        const name = seatName(seat, L);
        const tag = seat.bot ? `<span class="gd-avatar-tag">AI</span>` : me && k ? `<span class="gd-avatar-tag">${L("Me", "我")}</span>` : "";
        // my state tag rides in my plate (my cards sit over my avatar); others' hang under theirs
        put(v.body, `<div class="hd-av${me ? "" : " is-opp"}"><span class="hd-face">${faceHTML(seat)}</span>${tag}</div>
            <div class="hd-plate"><b class="hd-name">${esc(name)}</b><span class="hd-stack">${fmt(seat.stack)}</span>${k === 0 ? stateTag(seat) : ""}</div>
            ${k === 0 ? "" : stateTag(seat)}`);
        // cards: mine are the hero's big cards; others show backs while holding, faces when shown
        let holes = "";
        if (seat.shown && !(me && k === 0)) {
            holes = `<span class="hd-shown">${seat.shown.map((c, j) => card(c, `sh${i}${j}`, showdown ? (winCards.has(c) ? "is-win" : "is-dim") : "")).join("")}</span>`;
        } else if (seat.inHand && !me) {
            holes = `<span class="hd-backs">${ui.cardHTML({ back: true }, true)}${ui.cardHTML({ back: true }, true)}</span>`;
        }
        put(v.holes, holes);
        put(v.clock, toAct && !(me && k === 0) ? clockHTML(h.usingBank) : "");
        put(v.won, won ? `<b>+${fmt(won)}</b>` : "");
    }

    function renderBoard(h, winCards, showdown) {
        const board = h?.board || [];
        const slots = Array.from({ length: 5 }, (_, j) => board[j]
            ? `<span class="hd-slot">${card(board[j], `b${j}${board[j]}`, showdown ? (winCards.has(board[j]) ? "is-win" : "is-dim") : "")}</span>`
            : `<span class="hd-slot is-open"></span>`).join("");
        region("board", h ? slots : "");
    }

    function renderPots(h, t) {
        if (!h) return region("pots", "");
        const pots = h.pots || [];
        const bets = t.seats.reduce((a, s) => a + (s?.bet || 0), 0);
        const total = pots.reduce((a, p) => a + p.amt, 0) + bets;
        if (!total) return region("pots", "");
        const side = pots.length > 1
            ? `<div class="hd-sidepots">${pots.map((p, j) => `<span class="hd-sidepot">${j ? L(`Side ${j}`, `边池 ${j}`) : L("Main", "主池")} <b>${fmt(p.amt)}</b></span>`).join("")}</div>`
            : "";
        region("pots", `<div class="hd-pot" data-pot>${chipHTML("c4")}<span>${L("Pot", "底池")}</span><b>${fmt(total)}</b></div>${side}`);
    }

    function renderHero(t, me, h, winCards, showdown) {
        const seat = me?.seat != null ? t.seats[me.seat] : null;
        if (!seat || !me.hole) return region("hero", "");
        const best = me.best;
        const label = best ? handLabel(best, L) : "";
        const toAct = !!h && !h.done && h.toAct === me.seat;
        region("hero", `<div class="hd-hole">${me.hole.map((c, j) => card(c, `me${j}${c}`, showdown ? (winCards.has(c) ? "is-win" : "is-dim") : best && !best.cards.includes(c) ? "is-soft" : "", false)).join("")}</div>
            ${label ? `<span class="hd-best">${esc(label)}</span>` : ""}
            ${toAct ? `<div class="hd-hero-clock">${clockHTML(h.usingBank)}</div>` : ""}`);
    }

    // My seat, waiting or sitting out: a slim plate over my plate with the one useful button.
    function renderMine(t, me) {
        const seat = me?.seat != null ? t.seats[me.seat] : null;
        let html = "";
        if (seat?.state === "waiting" && t.hand) {
            html = `<div class="hd-mineplate"><span>${L("Waiting for the big blind", "等待大盲")}</span><button class="btn sm" type="button" data-do="postBB">${L("Post BB now", "立即补盲")}</button></div>`;
        } else if (seat?.state === "out") {
            html = `<div class="hd-mineplate"><span>${L("You are away", "暂离中")}</span><button class="btn sm ok" type="button" data-do="back">${L("I'm back", "回来")}</button></div>`;
        } else if (seat?.state === "busted") {
            html = `<div class="hd-mineplate"><span>${L("Out of chips", "筹码用完了")}</span><button class="btn sm" type="button" data-do="rebuy">${L("Rebuy", "补充筹码")}</button></div>`;
        } else if (me?.seat == null) {
            html = `<div class="hd-mineplate is-watch"><span>${L("Watching · tap an empty seat to sit", "观战中 · 点空位入座")}</span></div>`;
        }
        region("mine", html);
    }

    // ---------- actions ----------
    function legal() {
        const h = S.table?.hand;
        const me = S.me;
        if (!h || h.done || me?.seat == null || h.toAct !== me.seat || !me.legal) return null;
        return me.legal;
    }

    function potTotal() {
        const t = S.table;
        return (t.hand?.pots || []).reduce((a, p) => a + p.amt, 0) + t.seats.reduce((a, s) => a + (s?.bet || 0), 0);
    }

    function raiseBounds(lg) {
        const t = S.table;
        const seat = t.seats[S.me.seat];
        return { min: lg.minRaiseTo, max: lg.maxRaiseTo, bb: t.settings.bb, bet: seat.bet, call: lg.call, pot: potTotal() };
    }

    function presetTo(f, b) {
        if (f === "min") return b.min;
        if (f === "max") return b.max;
        const to = b.bet + b.call + f * (b.pot + b.call);
        return Math.min(b.max, Math.max(b.min, Math.round(to / b.bb) * b.bb));
    }

    function pill(cls, act, label, amount = "", attrs = "") {
        return `<button class="btn ${cls} hd-pill-act" type="button" data-act="${act}"${attrs}><i class="gd-hit" aria-hidden="true"></i><span>${label}</span>${amount ? `<b>${amount}</b>` : ""}</button>`;
    }

    function renderActions(t, me, h) {
        const lg = legal();
        const seat = me?.seat != null ? t.seats[me.seat] : null;
        stage.classList.toggle("is-acting", !!lg);
        if (lg) {
            if (V.raise && V.raise.hand !== h.id) V.raise = null;
            const b = lg.canRaise ? raiseBounds(lg) : null;
            const facing = lg.call > 0;
            const callAll = facing && lg.call >= seat.stack;
            const raiseLabel = !lg.canRaise ? "" : b.min >= b.max ? L("All-in", "全下") : facing ? L("Raise", "加注") : L("Bet", "下注");
            const open = !!V.raise && !!b;
            const value = open ? V.raise.value : 0;
            const third = !lg.canRaise ? ""
                : open ? pill("primary", "confirm", value >= b.max ? L("All-in", "全下") : facing ? L("Raise to", "加注到") : L("Bet", "下注"), fmt(value))
                    : pill("primary", b.min >= b.max ? "allin" : "raise", raiseLabel, b.min >= b.max ? fmt(b.max) : "");
            region("actions", `<div class="hd-row${V.busy ? " is-busy" : ""}">
                ${pill("hd-fold", "fold", L("Fold", "弃牌"))}
                ${lg.check ? pill("secondary", "check", L("Check", "过牌")) : pill("secondary", "call", callAll ? L("All-in", "全下") : L("Call", "跟注"), fmt(lg.call))}
                ${third}
            </div>`);
            region("raise", open ? raisePanelHTML(b) : "");
            if (open) syncSlider();
            return;
        }
        V.raise = null;
        region("raise", "");
        // after the hand: show my cards when the rules let me
        if (me?.canShow && h?.done) return region("actions", `<div class="hd-row">${pill("secondary", "show", L("Show cards", "亮牌"))}</div>`);
        // in the hand, not my turn: pre-action toggles, cleared whenever the bet to me changes
        if (seat && seat.inHand && h && !h.done && seat.state === "playing") {
            const toCall = Math.max(0, (h.currentBet || 0) - seat.bet);
            if (V.pre && V.pre.key !== preKey(h, V.pre.choice)) V.pre = null;
            const opts = toCall
                ? [["checkfold", L("Check / Fold", "过牌/弃牌")], ["call", `${L("Call", "跟注")} ${fmt(Math.min(toCall, seat.stack))}`], ["any", L("Call any", "跟任何注")]]
                : [["checkfold", L("Check / Fold", "过牌/弃牌")], ["check", L("Check", "过牌")], ["any", L("Call any", "跟任何注")]];
            return region("actions", `<div class="hd-row is-pre">${opts.map(([choice, label]) =>
                `<button class="hd-pre${V.pre?.choice === choice ? " is-on" : ""}" type="button" data-pre="${choice}" aria-pressed="${V.pre?.choice === choice}"><i aria-hidden="true"></i><span>${label}</span></button>`).join("")}</div>`);
        }
        region("actions", "");
    }

    function raisePanelHTML(b) {
        const presets = [["max", L("All-in", "全下")], [1, L("Pot", "1 池")], [2 / 3, L("2/3 pot", "⅔ 池")], [1 / 2, L("1/2 pot", "½ 池")], ["min", L("Min", "最小")]];
        return `<div class="hd-raise-panel" role="group" aria-label="${L("Raise amount", "加注金额")}">
            <div class="hd-presets">${presets.map(([f, label]) => {
                const to = presetTo(f, b);
                return `<button class="hd-preset${V.raise.value === to ? " is-on" : ""}" type="button" data-preset="${f}"${f !== "max" && f !== "min" && to >= b.max ? " disabled" : ""}><span>${label}</span><b>${short(to)}</b></button>`;
            }).join("")}</div>
            <div class="hd-slide">
                <output class="hd-raise-v">${fmt(V.raise.value)}</output>
                <div class="hd-slider" role="slider" tabindex="0" aria-valuemin="${b.min}" aria-valuemax="${b.max}" aria-valuenow="${V.raise.value}" aria-label="${L("Raise amount", "加注金额")}">
                    <i class="hd-slider-fill"></i><i class="hd-slider-thumb"></i>
                </div>
                <div class="hd-steps"><button class="hd-step" type="button" data-step="-1" aria-label="${L("Less", "减少")}">‹</button><span>${L(`±${fmt(b.bb)}`, `±${fmt(b.bb)}`)}</span><button class="hd-step" type="button" data-step="1" aria-label="${L("More", "增加")}">›</button></div>
            </div>
        </div>`;
    }

    function syncSlider() {
        const lg = legal();
        const el = R.raise.querySelector(".hd-slider");
        if (!lg || !el || !V.raise) return;
        const b = raiseBounds(lg);
        const f = b.max > b.min ? (V.raise.value - b.min) / (b.max - b.min) : 1;
        el.style.setProperty("--f", f.toFixed(4));
        el.setAttribute("aria-valuenow", V.raise.value);
        const out = R.raise.querySelector(".hd-raise-v");
        if (out) out.textContent = fmt(V.raise.value);
        R.raise.querySelectorAll(".hd-preset").forEach(p => p.classList.toggle("is-on", presetTo(p.dataset.preset === "min" || p.dataset.preset === "max" ? p.dataset.preset : Number(p.dataset.preset), b) === V.raise.value));
        const conf = R.actions.querySelector('[data-act="confirm"]');
        if (conf) {
            conf.querySelector("b").textContent = fmt(V.raise.value);
            conf.querySelector("span").textContent = V.raise.value >= b.max ? L("All-in", "全下") : lg.call > 0 ? L("Raise to", "加注到") : L("Bet", "下注");
        }
    }

    function setRaise(value) {
        const lg = legal();
        if (!lg || !V.raise) return;
        const b = raiseBounds(lg);
        V.raise.value = Math.min(b.max, Math.max(b.min, Math.round(value)));
        syncSlider();
    }

    function act(action, to) {
        const h = S.table?.hand;
        if (!h || V.stale) return;
        const lg = legal();
        if (!lg) return;
        let msg = { t: "act", hand: h.id, action };
        if (action === "raise") {
            if (to >= lg.maxRaiseTo) msg = { t: "act", hand: h.id, action: "allin" };
            else msg.to = to;
        }
        if (!send(msg)) return;
        V.raise = null;
        V.busy = true;
        R.actions.querySelector(".hd-row")?.classList.add("is-busy");
        region("raise", "");
    }

    function actionFailed() {
        V.busy = false;
        R.actions.querySelector(".hd-row")?.classList.remove("is-busy");
    }

    // A pre-action is tied to the bet it was chosen against: 跟任何注 holds for the street, the others
    // are cleared as soon as the bet to me changes.
    function preKey(h, choice) {
        return `${h.id}:${h.street}${choice === "any" ? "" : `:${h.currentBet}`}`;
    }

    // A pre-action set while waiting is played the moment my turn comes, if it still fits.
    function runPreAction() {
        const lg = legal();
        const h = S.table?.hand;
        if (!lg || !V.pre) return false;
        const { choice: pre, key } = V.pre;
        V.pre = null;
        if (key !== preKey(h, pre)) return false;
        if (pre === "checkfold") act(lg.check ? "check" : "fold");
        else if (pre === "check" && lg.check) act("check");
        else if (pre === "call" && !lg.check) act("call");
        else if (pre === "any") act(lg.check ? "check" : "call");
        else return false;
        return true;
    }

    // ---------- word, hud, menu ----------
    function renderWord(h, winners) {
        if (!h?.done || !winners?.length) return region("word", "");
        const top = winners.find(w => w.hand) || null;
        const cat = top ? handCat(top.hand) : "";
        const word = cat ? catName(cat, L) : "";
        const split = new Set(winners.map(w => w.seat)).size > 1;
        region("word", word || split ? `<div class="hd-word-in">${word ? ui.wordHTML(word) : ""}${split ? `<small>${L("Split pot", "平分底池")}</small>` : ""}</div>` : "");
    }

    function renderHud() {
        region("hud", `<button class="gd-menu-btn" type="button" data-menu aria-label="${L("Menu", "菜单")}" aria-expanded="${V.menuOpen}"><i></i><i></i><i></i></button>
            <span class="hd-code">${L("Table", "房间")} <b>${esc(S.code)}</b></span>`);
        region("hudRight", `<button class="gd-round-btn" type="button" data-pop="last">${icon("last")}<span>${L("Last", "上一手")}</span></button>
            <button class="gd-round-btn" type="button" data-pop="rules">${icon("rules")}<span>${L("Rules", "规则")}</span></button>`);
    }

    function menuHTML() {
        if (!V.menuOpen) return "";
        const music = window.GuandanMusic;
        const seat = S.me?.seat != null ? S.table.seats[S.me.seat] : null;
        const items = [
            ["invite", icon("invite"), L("Invite friends", "邀请好友")],
            ["rules", icon("rules"), L("Rules", "规则")],
            ["hands", icon("hands"), L("Hand ranking", "牌型")],
            ["lang", icon("lang"), ui.isZH() ? "English" : "中文"],
            music ? ["music", icon("music"), music.isOn?.() ? L("Music: on", "音乐：开") : L("Music: off", "音乐：关")] : null,
            seat ? ["topup", icon("chips"), L("Top up chips", "补充筹码")] : null,
            seat ? (seat.state === "out" ? ["back", icon("play"), L("I'm back", "回来")] : ["away", icon("pause"), L("Sit out", "暂离")]) : null,
            seat ? ["stand", icon("stand"), L("Stand up", "站起")] : null,
            ["lobby", icon("exit"), L("Back to lobby", "返回大厅")]
        ].filter(Boolean);
        return `<div class="gd-scrim"></div><div class="gd-menu" role="menu">${items.map(([act2, ic, label]) => `<button type="button" role="menuitem" data-m="${act2}">${ic}<span>${label}</span></button>`).join("")}</div>`;
    }

    // ---------- clicks ----------
    stage.addEventListener("click", async event => {
        if (event.target.closest(".gd-scrim")) {
            V.menuOpen = false;
            return region("menu", menuHTML());
        }
        const btn = event.target.closest("button");
        if (!btn) {
            if (V.raise && !event.target.closest(".hd-raise")) {
                V.raise = null;
                update({ table: S.table, me: S.me });
            }
            return;
        }
        if (btn.disabled) return;
        if (btn.hasAttribute("data-menu")) {
            V.menuOpen = !V.menuOpen;
            renderHud();
            return region("menu", menuHTML());
        }
        if (btn.dataset.m) return menuAction(btn.dataset.m);
        if (btn.dataset.pop === "last") return popups.openLastHand();
        if (btn.dataset.pop === "rules") return popups.openRules();
        if (btn.dataset.sit != null) return popups.openBuyIn(Number(btn.dataset.sit));
        if (btn.dataset.do === "postBB") return send({ t: "postBB" });
        if (btn.dataset.do === "back") return send({ t: "sitOut", on: false });
        if (btn.dataset.do === "rebuy") return popups.openTopUp(true);
        if (btn.dataset.pre) {
            const choice = btn.dataset.pre;
            V.pre = V.pre?.choice === choice ? null : { choice, key: preKey(S.table.hand, choice) };
            return renderActions(S.table, S.me, S.table.hand);
        }
        if (btn.dataset.preset) {
            const lg = legal();
            if (!lg) return;
            const f = btn.dataset.preset;
            return setRaise(presetTo(f === "min" || f === "max" ? f : Number(f), raiseBounds(lg)));
        }
        if (btn.dataset.step) {
            const lg = legal();
            if (lg && V.raise) setRaise(V.raise.value + Number(btn.dataset.step) * S.table.settings.bb);
            return;
        }
        const a = btn.dataset.act;
        if (!a || btn.closest(".is-busy")) return;
        if (a === "show") return send({ t: "show" });
        if (a === "raise") return openRaise();
        if (a === "confirm") return act("raise", V.raise.value);
        if (a === "allin") return act("allin");
        act(a);
    });

    function openRaise() {
        const lg = legal();
        if (!lg?.canRaise) return;
        V.raise = { hand: S.table.hand.id, value: presetTo("min", raiseBounds(lg)) };
        renderActions(S.table, S.me, S.table.hand);
        R.raise.querySelector(".hd-slider")?.focus({ preventScroll: true });
    }

    async function menuAction(m) {
        V.menuOpen = false;
        renderHud();
        region("menu", "");
        if (m === "invite") return popups.invite();
        if (m === "rules") return popups.openRules();
        if (m === "hands") return popups.openRules(3);
        if (m === "lang") return ui.toggleLang();
        if (m === "music") {
            const music = window.GuandanMusic;
            music.setOn(!music.isOn());
            return ui.showToast(music.isOn() ? L("Music on", "音乐已开启") : L("Music off", "音乐已关闭"));
        }
        if (m === "topup") return popups.openTopUp(false);
        if (m === "away") return send({ t: "sitOut", on: true });
        if (m === "back") return send({ t: "sitOut", on: false });
        if (m === "stand") {
            const seat = S.table.seats[S.me.seat];
            if (seat?.inHand && !S.table.hand?.done && !await ui.confirmPopup({
                title: L("Stand up", "站起"),
                text: L("You are in this hand: standing up folds it. Your chips go back to your bankroll.", "你还在这一手牌里，站起会弃牌，剩余筹码回到你的账户。"),
                ok: L("Stand up", "站起")
            })) return;
            return send({ t: "stand" });
        }
        if (m === "lobby") return popups.leave();
    }

    // slider: drag along the track (vertical on landscape, horizontal on portrait), arrows on the keyboard
    stage.addEventListener("pointerdown", event => {
        const track = event.target.closest(".hd-slider");
        if (!track || !V.raise) return;
        event.preventDefault();
        track.setPointerCapture?.(event.pointerId);
        const move = e => {
            const lg = legal();
            if (!lg) return;
            const b = raiseBounds(lg);
            const r = track.getBoundingClientRect();
            let f = V.portrait ? (e.clientX - r.left) / r.width : 1 - (e.clientY - r.top) / r.height;
            f = Math.min(1, Math.max(0, f));
            const raw = b.min + f * (b.max - b.min);
            setRaise(f >= .995 ? b.max : f <= .005 ? b.min : Math.round(raw / b.bb) * b.bb);
        };
        move(event);
        const up = () => {
            track.removeEventListener("pointermove", move);
            track.removeEventListener("pointerup", up);
            track.removeEventListener("pointercancel", up);
        };
        track.addEventListener("pointermove", move);
        track.addEventListener("pointerup", up);
        track.addEventListener("pointercancel", up);
    });

    // F fold, C check/call, R raise (or bet), Enter confirms, Esc closes the panel. The c of a typed "picasso"
    // is never a call: a key that continues the word is only the word.
    let typed = "";
    function onKey(event) {
        if (S.screen !== "htable" || event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.target?.closest?.("input, textarea, [contenteditable='true']") || document.querySelector(".gd-popup-layer, .hd-page")) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (key.length === 1) {
            typed = (typed + key).slice(-PICASSO.length);
            const word = [...Array(typed.length).keys()].some(i => PICASSO.startsWith(typed.slice(i)) && typed.length - i >= 2);
            if (word) return;
        }
        if (V.raise && event.target.closest?.(".hd-slider") && (key === "ArrowUp" || key === "ArrowRight" || key === "ArrowDown" || key === "ArrowLeft")) {
            event.preventDefault();
            return setRaise(V.raise.value + (key === "ArrowUp" || key === "ArrowRight" ? 1 : -1) * S.table.settings.bb);
        }
        const lg = legal();
        if (key === "Escape" && (V.raise || V.menuOpen)) {
            V.raise = null;
            V.menuOpen = false;
            renderHud();
            region("menu", "");
            return renderActions(S.table, S.me, S.table.hand);
        }
        if (!lg || V.busy) return;
        if (key === "f") act("fold");
        else if (key === "c") act(lg.check ? "check" : "call");
        else if (key === "r" && lg.canRaise) {
            if (V.raise) act("raise", V.raise.value);
            else openRaise();
        } else if (key === "Enter" && V.raise) {
            event.preventDefault();
            act("raise", V.raise.value);
        }
    }
    document.addEventListener("keydown", onKey);

    // ---------- timer ----------
    function tick() {
        const h = S.table?.hand;
        const left = remaining();
        stage.querySelectorAll("[data-clock]").forEach(el => {
            const b = el.querySelector("b");
            if (b.textContent !== String(left)) b.textContent = left;
            el.classList.toggle("is-danger", !h?.usingBank && left <= 5);
        });
        if (!h || h.done || h.toAct == null) clearInterval(V.timer);
    }

    // ---------- motion ----------
    function centreOf(el) {
        return stagePoint(el.getBoundingClientRect());
    }

    function fly(html, from, to, { ms = 320, delay = 0, scale = 1, fade = false, cls = "" } = {}) {
        const el = document.createElement("div");
        el.className = `hd-fly${cls ? ` ${cls}` : ""}`;
        el.innerHTML = html;
        el.style.left = `${to.x}px`;
        el.style.top = `${to.y}px`;
        fx.appendChild(el);
        const run = el.animate([
            { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${scale})`, opacity: fade ? 0 : 1 },
            { transform: "translate(0, 0) scale(1)", opacity: 1, offset: .85 },
            { transform: "translate(0, 0) scale(1)", opacity: fade ? 0 : 1 }
        ], { duration: ms, delay, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "both" });
        run.finished.then(() => el.remove(), () => el.remove());
        return run;
    }

    function animate(prev) {
        if (V.destroyed) return;
        const t = S.table;
        const h = t.hand;
        const ph = prev.table?.hand || null;
        const motion = !reduced() && !!prev.table;
        const deckPt = { x: V.G.cx, y: V.G.boardY - 30 };
        // a new hand: card backs from the dealer to every seat dealt in, my two cards turn over
        if (h && h.id !== V.dealt) {
            const fresh = !!ph && ph.id !== h.id;
            V.dealt = h.id;
            V.shownWin = "";
            V.lastAct.clear();
            V.labels.forEach(clearTimeout);
            V.labels.clear();
            V.seats.forEach(v => { v.label.innerHTML = ""; v.label.classList.remove("is-on"); });
            if (motion && fresh && h.street === "preflop" && !h.board.length) dealIn(h, deckPt);
        }
        // bets going in, labels for the actions just taken
        t.seats.forEach((seat, i) => {
            if (!seat) return;
            const k = slotOf(i);
            const before = prev.table?.seats?.[i];
            const sameHand = ph && h && ph.id === h.id;
            if (motion && sameHand && ph.street === h.street && seat.bet > (before?.bet || 0)) {
                const bet = V.bets[k];
                bet.animate([{ transform: `translate(${(V.G.seats[k].x - V.G.seats[k].bx).toFixed(1)}px, ${(V.G.seats[k].y - V.G.seats[k].by).toFixed(1)}px) scale(.5)`, opacity: .2 }, { transform: "none", opacity: 1 }],
                    { duration: 240, easing: "cubic-bezier(.2, .8, .2, 1)" });
            }
            const lastKey = seat.last ? `${h?.id}:${seat.last.a}:${seat.last.amt ?? ""}:${h?.street}` : "";
            if (seat.last && V.lastAct.get(i) !== lastKey) {
                const show = !!prev.table && V.lastAct.has(i) || (!!prev.table && sameHand);
                V.lastAct.set(i, lastKey);
                if (show && !["sb", "bb"].includes(seat.last.a)) showLabel(k, seat.last);
            }
        });
        // a street ends: the bets slide into the pot
        if (motion && ph && h && ph.id === h.id && (ph.street !== h.street || (!ph.done && h.done))) {
            const potEl = R.pots.querySelector("[data-pot]");
            const to = potEl ? centreOf(potEl) : { x: V.G.cx, y: V.G.boardY - 90 };
            prev.table.seats.forEach((seat, i) => {
                if (!seat?.bet) return;
                const k = slotOf(i);
                const p = V.G.seats[k];
                fly(chipsHTML(seat.bet, t.settings.bb, 2), { x: p.bx, y: p.by }, to, { ms: 340, delay: 40, fade: true });
            });
            if (potEl) potEl.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }], { duration: 260, delay: 300 });
        }
        // new board cards turn over in their slots
        const before = ph && h && ph.id === h.id ? ph.board.length : h && h.id !== ph?.id ? 0 : h?.board.length || 0;
        if (motion && h && h.board.length > before) {
            [...R.board.querySelectorAll(".hd-slot .card")].slice(before).forEach((el, j) => {
                el.animate([{ transform: "translateY(-18px) scaleX(0)", opacity: .4 }, { transform: "translateY(-6px) scaleX(.15)", opacity: 1, offset: .35 }, { transform: "none", opacity: 1 }],
                    { duration: 340, delay: 120 * j + (ph?.street !== h.street ? 380 : 0), easing: "cubic-bezier(.2, .8, .2, 1)", fill: "backwards" });
            });
        }
        // cards shown at the showdown turn over too
        t.seats.forEach((seat, i) => {
            if (!motion || !seat?.shown || prev.table?.seats?.[i]?.shown) return;
            V.seats[slotOf(i)].holes.querySelectorAll(".card").forEach((el, j) => {
                el.animate([{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 260, delay: 80 * j, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "backwards" });
            });
        });
        // the hand is won: chips from the pot to each winner; the hand's word; a big pot bursts
        if (h?.done && h.winners?.length && V.shownWin !== h.id) {
            V.shownWin = h.id;
            if (motion && ph?.id === h.id) awardChips(h, t);
        }
    }

    function dealIn(h, deckPt) {
        const t = S.table;
        const order = [];
        for (let j = 1; j <= V.n; j++) {
            const i = (h.button + j) % V.n;
            if (t.seats[i]?.inHand || (S.me?.seat === i && S.me.hole)) order.push(i);
        }
        const step = Math.min(70, 900 / Math.max(1, order.length * 2));
        const heroCards = [...R.hero.querySelectorAll(".hd-hole .card")];
        heroCards.forEach(el => { el.style.opacity = "0"; });
        V.seats.forEach(v => v.holes.classList.add("is-dealing"));
        let last = 0;
        [0, 1].forEach(round => order.forEach((i, j) => {
            const k = slotOf(i);
            const delay = (round * order.length + j) * step;
            last = delay;
            const target = k === 0 && heroCards[round] ? heroCards[round] : V.seats[k].holes;
            const to = centreOf(target);
            fly(ui.cardHTML({ back: true }, true), deckPt, to, { ms: 300, delay, scale: .7, cls: "is-card" });
        }));
        setTimeout(() => {
            if (V.destroyed) return;
            V.seats.forEach(v => v.holes.classList.remove("is-dealing"));
            heroCards.forEach((el, j) => {
                el.style.opacity = "";
                el.animate([{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 260, delay: j * 90, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "backwards" });
            });
        }, last + 300);
    }

    function showLabel(k, last) {
        const v = V.seats[k];
        const amt = last.amt && ["call", "bet", "raise", "allin"].includes(last.a) ? ` ${short(last.amt)}` : "";
        v.label.innerHTML = `<span class="hd-act is-${last.a}">${actionName(last.a, L)}${amt}</span>`;
        v.label.classList.remove("is-on");
        void v.label.offsetWidth;
        v.label.classList.add("is-on");
        clearTimeout(V.labels.get(k));
        V.labels.set(k, setTimeout(() => v.label.classList.remove("is-on"), LABEL_MS));
    }

    function awardChips(h, t) {
        const potEl = R.pots.querySelector("[data-pot]");
        const from = potEl ? centreOf(potEl) : { x: V.G.cx, y: V.G.boardY - 90 };
        const bb = t.settings.bb;
        const total = h.winners.reduce((a, w) => a + w.amt, 0);
        const wait = h.board.length && h.street === "showdown" ? 700 : 250;
        h.winners.forEach((w, j) => {
            const k = slotOf(w.seat);
            const p = V.G.seats[k];
            fly(chipsHTML(w.amt, bb, 3), from, { x: p.x, y: p.y }, { ms: 520, delay: wait + j * 160, fade: true, cls: "is-win" });
            V.seats[k].won.animate([{ transform: "translateY(10px) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, delay: wait + 420 + j * 160, easing: "cubic-bezier(.34, 1.4, .64, 1)", fill: "backwards" });
        });
        const word = R.word.querySelector(".hd-word-in");
        if (word) word.animate([{ transform: "scale(1.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 260, delay: wait - 150, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "backwards" });
        const top = h.winners.find(w => w.hand);
        const cat = top ? handCat(top.hand) : "";
        const strong = ["quads", "straight_flush", "royal"].includes(cat);
        if (total >= BIG_POT_BB * bb || strong) {
            const tier = cat === "royal" || cat === "straight_flush" ? "flush" : strong ? "big" : "bomb";
            const text = cat ? catName(cat, L) : L("Big pot", "大底池");
            setTimeout(() => {
                if (V.destroyed) return;
                fx.insertAdjacentHTML("beforeend", ui.burstHTML(tier, R.word.querySelector(".gd-word") ? "" : text, V.G.cx, V.G.boardY));
                const set = fx.lastElementChild;
                setTimeout(() => set.remove(), 1500);
            }, wait - 100);
        }
    }

    // ---------- lifecycle ----------
    function onResize() {
        cancelAnimationFrame(V.frame);
        V.frame = requestAnimationFrame(() => {
            layout();
            update({ table: S.table, me: S.me });
        });
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    layout();

    return {
        update(prev) {
            const myTurnBefore = !!prev.table?.hand && prev.table.hand.toAct === S.me?.seat && !prev.table.hand.done;
            V.busy = false;
            update(prev);
            if (!myTurnBefore || prev.table?.hand?.id !== S.table.hand?.id) runPreAction();
        },
        setStatus(status) {
            if (status !== "online") V.stale = true;
            if (S.table) {
                region("status", status !== "online" ? `<span>${L("Reconnecting…", "重新连接中…")}</span>` : "");
                stage.classList.toggle("is-stale", status !== "online" || V.stale);
            }
        },
        actionFailed,
        destroy() {
            V.destroyed = true;
            clearInterval(V.timer);
            V.labels.forEach(clearTimeout);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("orientationchange", onResize);
        }
    };
}
