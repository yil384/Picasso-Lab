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
    // portrait: the board spans most of the narrow felt, so no side seat sits within about 30 degrees of its row
    port: { 2: [90, 270], 3: [90, 215, 325], 4: [90, 212, 270, 328], 5: [90, 145, 230, 310, 35], 6: [90, 140, 215, 270, 325, 40],
        7: [90, 128, 212, 250, 290, 328, 52], 8: [90, 122, 150, 212, 270, 328, 30, 58], 9: [90, 120, 149, 211, 246, 294, 329, 31, 60] }
};
const LABEL_MS = 1500;
// how far a seat's bet sits from its avatar at most, and at least (design px)
const BET_REACH = { port: 160, land: 200, min: 104 };
// the alarm clock beside a seat while it acts (holdem.css .hd-clock), relative to the seat's avatar centre:
// [left, top, right, bottom]; the dealer button keeps clear of it
const CLOCK_BOX = {
    land: { left: [82, -40, 152, 34], right: [-152, -40, -82, 34], top: [-116, -36, -46, 38], bottom: [82, -40, 152, 34] },
    port: { left: [104, -40, 174, 34], right: [-174, -40, -104, 34], top: [-116, -36, -46, 38], bottom: [82, -40, 152, 34] }
};
// a landscape side seat with no room for its bet past its clock (8-9 seats) has the clock on its outer side
function clockBox(p, portrait) {
    const c = CLOCK_BOX[portrait ? "port" : "land"][p.side];
    return c && p.clockOut ? [-c[2], c[1], -c[0], c[3]] : c;
}
const SFX_URL = "https://yil384.github.io/Picasso-Lab/events/static/holdem-sfx/";
const SFX_KEY = "picasso.holdem.sfx";
const SFX_NAMES = ["deal", "board", "bet", "collect", "win"];
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
    stand: `<circle cx="13" cy="9" r="5" fill="#fff"/><path fill="#fff" d="M5 28c0-6 3.6-10 8-10s8 4 8 10Z"/><path fill="#ffd66b" d="M21 13.5h7v3h-7z"/>`,
    sfx: `<path fill="#fff" d="M4 12h5.5L17 5.5v21L9.5 20H4Z"/><path fill="#ffd66b" d="M20.5 10.5c1.9 1.4 3 3.3 3 5.5s-1.1 4.1-3 5.5l-1.7-2.1c1.2-.9 1.9-2.1 1.9-3.4s-.7-2.5-1.9-3.4Zm3.3-4.2C27 8.6 29 12.1 29 16s-2 7.4-5.2 9.7l-1.7-2.1c2.5-1.8 4.1-4.6 4.1-7.6s-1.6-5.8-4.1-7.6Z"/>`
};

// Table sounds: real CC0 casino recordings (holdem-sfx/LICENSE.txt), quiet, behind the 音效 switch in the ☰ menu.
const sfx = {
    on: (() => { try { return localStorage.getItem(SFX_KEY) !== "off"; } catch (_) { return true; } })(),
    bank: {},
    load() {
        if (this.on) SFX_NAMES.forEach(name => { this.bank[name] ||= Object.assign(new Audio(`${SFX_URL}${name}.mp3`), { preload: "auto" }); });
    },
    play(name) {
        if (!this.on) return;
        this.load();
        const base = this.bank[name];
        const a = base.paused ? base : base.cloneNode();
        a.volume = .35;
        a.play().catch(() => {});
    },
    set(on) {
        this.on = on;
        try { localStorage.setItem(SFX_KEY, on ? "on" : "off"); } catch (_) {}
        this.load();
    }
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
        stale: false, busy: false, timer: 0, frame: 0, destroyed: false, keys: "", boardBox: null
    };
    const reduced = () => ui.prefersReducedMotion();

    ui.root.innerHTML = `<div class="hd-viewport">
        <i class="gd-safe-probe" aria-hidden="true"></i>
        <div class="hd-stage">
            ${ui.tableDefsHTML}${CHIP_DEFS}
            <div class="hd-felt" aria-hidden="true"><div class="hd-felt-in"></div><div class="hd-mark" data-r="mark"></div></div>
            <div class="gd-fx-host hd-fx-under" aria-hidden="true"></div>
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
    const fxUnder = stage.querySelector(".hd-fx-under");
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
            // the felt runs from just under the HUD to just above my seat, which sits a little over the pill row
            // (the raise panel overlays the lower felt while it is open)
            rx = Math.min(w * .42, 330);
            heroY = h - 250;
            const top = 190;
            const bottom = heroY - 40;
            cy = (top + bottom) / 2;
            ry = (bottom - top) / 2;
        } else {
            rx = Math.min(w * .37, 600);
            ry = Math.min(h * .36, rx * .62);
            cy = h * .46;
            heroY = h - 92;
            // a tall stage (1280 x 800) would leave my seat on the floor under the felt: my avatar sits on the
            // bottom rail, my cards on the felt above it (the board keeps its place, so my bet still fits between)
            if (heroY - (cy + ry) > 40) heroY = cy + ry + 10;
        }
        const angles = (portrait ? ANGLES.port : ANGLES.land)[n] || ANGLES.land[6];
        const margin = portrait ? 72 : 56;
        // portrait: the five board cards' box (design px, with the winners' lift); a side seat's plate never meets it
        const board = { left: cx - 270, right: cx + 270, top: cy - 92, bottom: cy + 80 };
        const seats = angles.map((deg, k) => {
            const a = deg * Math.PI / 180;
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            const out = edge(rx + 8, ry + 10, cos, sin);
            // landscape: a side seat's bet sits a little further in, clear of its clock (past its card backs)
            const inner = edge(rx, ry, cos, sin) * (portrait ? .6 - .1 * Math.abs(sin) : .6 - .04 * Math.abs(sin));
            let x = cx + out * cos;
            let y = cy + out * sin;
            if (k === 0) {
                x = cx;
                y = heroY;
            }
            x = Math.min(w - margin, Math.max(margin, x));
            y = Math.max(portrait ? 168 : 78, y);
            // landscape: the lower seats keep their plates clear of the action pills (a wide phone stage pushes them down)
            if (!portrait && k && sin > 0) y = Math.min(y, h - 196);
            // portrait: a seat whose plate (label above to plate below) would meet the board steps clear of it
            if (portrait && k && x + 84 > board.left && x - 84 < board.right && y + 100 > board.top && y - 72 < board.bottom) {
                y = y < cy ? board.top - 100 : board.bottom + 72;
            }
            const side = k === 0 ? "bottom" : Math.abs(cos) < .35 ? (sin < 0 ? "top" : "bottom") : cos < 0 ? "left" : "right";
            // bets sit on an inner ring toward the centre; the hero's bet over the hole cards
            const bx = k === 0 ? cx : cx + inner * cos;
            const by = k === 0 ? heroY - (portrait ? 278 : 228) : cy + inner * sin;
            // portrait: a side seat low enough that its face-up cards beside it would meet my cards
            const low = portrait && k > 0 && (side === "left" || side === "right") && y > heroY - 284;
            return { x, y, side, low, bx, by, cos, sin };
        });
        // A bet must read as its own seat's: measured from where the seat ended up (after the clamps above), on the
        // line toward its inner-ring slot, at most BET_REACH away (the tall portrait felt put corner seats' bets next
        // to their neighbours), and pulled in further while another avatar would be nearer than its own (with room
        // to spare). The hero's bet stays over its cards.
        const reach = portrait ? BET_REACH.port : BET_REACH.land;
        // my cards count as my place too (a bet beside them reads as mine)
        const heroCy = heroY - (portrait ? 152 : 128);
        const anchors = seats.map((o, j) => (j ? o : { x: cx, y: heroCy }));
        const nearest = (p, k) => Math.min(...anchors.filter((o, j) => j !== k).map(o => Math.hypot(o.x - p.bx, o.y - p.by)));
        const mine = (p, k, m) => Math.hypot(p.x - p.bx, p.y - p.by) * m < nearest(p, k);
        // my clock beside my cards (holdem.css .hd-hero-clock) and each seat's own clock (shown while it acts, e.g.
        // facing a raise over its own bet): a bet keeps clear of both
        const heroClock = portrait ? [cx - 140, heroCy - 137, cx - 70, heroCy - 63] : [cx - 176, heroCy - 37, cx - 106, heroCy + 37];
        const [hw, hh, pad] = [56, 18, 6]; // half a bet's box (chips and a 5-figure amount), and the room around it
        const meets = (p, b) => p.bx + hw + pad > b[0] && p.bx - hw - pad < b[2] && p.by + hh + pad > b[1] && p.by - hh - pad < b[3];
        seats.forEach((p, k) => {
            if (!k) return;
            const vx = p.bx - p.x;
            const vy = p.by - p.y;
            const d = Math.hypot(vx, vy) || 1;
            const at = D => { p.bx = p.x + vx / d * D; p.by = p.y + vy / d * D; };
            let D = Math.min(d, reach);
            for (; D > BET_REACH.min; D -= 4) {
                at(D);
                if (mine(p, k, 1.25)) break;
            }
            at(D);
            const c = clockBox(p, portrait);
            let own = c ? [p.x + c[0], p.y + c[1], p.x + c[2], p.y + c[3]] : null;
            const clear = () => !(own && meets(p, own)) && !meets(p, heroClock);
            if (clear()) return;
            // in the way of a clock: the nearest spot that is clear of both clocks and still reads as this seat's
            // (further in along the same line, or just past the clock it met: above, below or beside it)
            const [ox, oy] = [p.bx, p.by];
            const spots = [];
            for (let E = D + 4; E <= reach + 80; E += 4) spots.push([p.x + vx / d * E, p.y + vy / d * E]);
            for (const b of [own, heroClock].filter(b => b && meets(p, b))) {
                spots.push([ox, b[1] - hh - pad], [ox, b[3] + hh + pad], [b[0] - hw - pad, oy], [b[2] + hw + pad, oy]);
            }
            let best = null;
            for (const [x, y] of spots) {
                p.bx = x;
                p.by = y;
                const move = Math.hypot(x - ox, y - oy);
                if (clear() && mine(p, k, 1.1) && (!best || move < best[2])) best = [x, y, move];
            }
            [p.bx, p.by] = best ? [best[0], best[1]] : [ox, oy];
            if (best) return;
            // a crowded landscape side seat: its clock goes to the outer side (on the rail), its bet stays in front
            if (!portrait && (p.side === "left" || p.side === "right")) {
                p.clockOut = true;
                const f = clockBox(p, portrait);
                own = [p.x + f[0], p.y + f[1], p.x + f[2], p.y + f[3]];
            }
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
            el.className = `hd-seat is-${p.side}${p.low ? " is-low" : ""}${p.clockOut ? " is-clock-out" : ""}${k === 0 ? " is-hero" : ""}`;
            el.style.left = `${p.x.toFixed(1)}px`;
            el.style.top = `${p.y.toFixed(1)}px`;
            el.innerHTML = `<div class="hd-seat-body"></div><div class="hd-holes"></div><div class="hd-clockslot"></div><div class="hd-label"></div>`;
            seatsEl.appendChild(el);
            V.seats.push({ el, body: el.children[0], holes: el.children[1], clock: el.children[2], label: el.children[3] });
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
    function faceHTML(seat, i) {
        if (seat.bot) return ui.defaultFaceHTML(botMark(i));
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

    // A seat without a deadline (a bot thinking) shows the clock's hands instead of seconds.
    function clockHTML(bank) {
        const timed = !!S.table?.hand?.deadline;
        return `<div class="gd-clock hd-clock${bank ? " is-bank" : ""}${timed ? "" : " is-free"}"${timed ? " data-clock" : ""}><svg viewBox="0 0 100 106" aria-hidden="true"><use href="#gd-sym-clock"/></svg><b>${timed ? remaining() : ""}</b>${bank ? `<span class="hd-bank">${L("Time bank", "时间银行")}</span>` : ""}</div>`;
    }

    function stateTag(seat, h) {
        if (!seat.connected && !seat.bot) return `<span class="hd-tag is-off">${L("Offline", "离线")}</span>`;
        // 全下 only while the hand is live (a winner who was all in has chips again)
        if (seat.state === "allin" && h && !h.done && !seat.stack) return `<span class="hd-tag is-allin">${L("All-in", "全下")}</span>`;
        if (seat.state === "out") return `<span class="hd-tag is-grey">${L("Away", "暂离")}</span>`;
        if (seat.state === "waiting") return `<span class="hd-tag is-grey">${L("Waiting", "等待")}</span>`;
        // a player out of chips may top up; an AI never does (the service takes it off the table)
        if (seat.state === "busted") return `<span class="hd-tag is-grey">${seat.bot ? L("Out", "出局") : L("Rebuying", "补码中")}</span>`;
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
        // bets, and a won pot where the chips land: the seat's bet slot on the felt
        for (let k = 0; k < V.n; k++) {
            const i = seatAt(k);
            const seat = t.seats[i];
            const won = seat && h?.done ? (winners || []).filter(w => w.seat === i).reduce((a, w) => a + w.amt, 0) : 0;
            put(V.bets[k], seat && seat.bet ? betHTML(seat.bet, bb) : won ? `${chipsHTML(won, bb, won >= BIG_POT_BB * bb ? 3 : 2)}<b class="is-won">+${fmt(won)}</b>` : "");
        }
        // board and pots
        renderBoard(h, winCards, showdown);
        renderPots(h, t);
        placeDealer(h, t);
        renderHero(t, me, h, winCards, showdown);
        renderMine(t, me);
        renderActions(t, me, h);
        renderWord(h, winners);
        fitWord();
        clearHero(h, me);
        region("menu", menuHTML());
        region("status", V.stale || S.status !== "online" ? `<span>${L("Reconnecting…", "重新连接中…")}</span>` : "");
        stage.classList.toggle("is-stale", V.stale || S.status !== "online");

        animate(prev);
        tick();
        clearInterval(V.timer);
        if (h && !h.done && h.toAct != null) V.timer = setInterval(tick, TICK_MS);
    }

    // The dealer button: on the felt just past the button seat's plate, beside its bet (below it on the sides,
    // left of it at the top); mine right beside my avatar, clear of the hand label under my cards and my winnings.
    function placeDealer(h, t) {
        if (h && h.button != null && t.seats[h.button]) {
            const k = slotOf(h.button);
            const p = V.G.seats[k];
            const dx = (V.G.cx - p.x) / (Math.hypot(V.G.cx - p.x, V.G.boardY - p.y) || 1);
            const dy = (V.G.boardY - p.y) / (Math.hypot(V.G.cx - p.x, V.G.boardY - p.y) || 1);
            let px = -dy;
            let py = dx;
            if (py < 0 || (Math.abs(py) < .01 && px > 0)) {
                px = -px;
                py = -py;
            }
            // a side seat's shown cards lie toward the centre: the button goes past them
            const out = 108 + ((p.side === "left" || p.side === "right") && t.seats[h.button].shown ? 48 : 0);
            let x = k === 0 ? p.x + (V.portrait ? 86 : 80) : p.x + dx * out + px * 84;
            let y = k === 0 ? p.y - 28 : p.y + dy * out + py * 84;
            // a low portrait side seat: toward the centre lies my cards, so the button sits under its plate's inner end;
            // a portrait side seat showing its cards (beside and above its avatar): the button goes under them
            const sideSeat = p.side === "left" || p.side === "right";
            if (k && V.portrait && p.low) {
                x = p.x + (p.side === "left" ? 70 : -70);
                y = p.y + 112;
            } else if (k && V.portrait && sideSeat && t.seats[h.button].shown) {
                x = p.x + (p.side === "left" ? 104 : -104);
                y = p.y + 60;
            }
            // never on the board's cards (a side seat of the narrow portrait table): step above or below them,
            // with room for the winning cards' lift
            // (the five slots' box is measured once per layout, no forced layout on every snapshot; before the
            // flop the board is not shown and measures nothing)
            if (k && V.boardBox?.key !== V.keys && h.board.length) {
                const r = R.board.getBoundingClientRect();
                if (r.width) V.boardBox = { key: V.keys, top: (r.top - V.top) / V.s, bottom: (r.bottom - V.top) / V.s, left: (r.left - V.left) / V.s, right: (r.right - V.left) / V.s };
            }
            const bx = V.boardBox?.key === V.keys ? V.boardBox : null;
            if (k && !(V.portrait && p.low) && bx && x > bx.left - 22 && x < bx.right + 22 && y > bx.top - 30 && y < bx.bottom + 22) {
                if (V.portrait && (p.side === "left" || p.side === "right")) {
                    // the narrow portrait table: beside the plate on the inner side, between its cards and its bet
                    x = p.x + (p.side === "left" ? 104 : -104);
                    y = p.y + 60;
                } else {
                    y = p.y < V.G.boardY ? bx.top - 34 : bx.bottom + 26;
                }
            }
            // never under the button seat's own clock (it acts first three-handed, exactly when the button matters):
            // just below the clock, or above it where below would meet the board
            if (k) {
                const c = clockBox(p, V.portrait);
                const R2 = 17 + 6;
                if (c && x + R2 > p.x + c[0] && x - R2 < p.x + c[2] && y + R2 > p.y + c[1] && y - R2 < p.y + c[3]) {
                    y = p.y + c[3] + R2;
                    if (bx && x > bx.left - 22 && x < bx.right + 22 && y > bx.top - 30 && y < bx.bottom + 22) y = p.y + c[1] - R2;
                }
            }
            dealer.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            dealer.classList.add("is-on");
            dealer.classList.toggle("is-mine", k === 0);
        } else {
            dealer.classList.remove("is-on");
        }
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
        v.el.classList.toggle("has-shown", !!seat?.shown && !(me && k === 0));
        if (!seat) {
            // an empty seat: the gold 入座 disc while I can take it; seated, a dim 空位 disc keeps the table's shape
            // (opponents bunched on one side read as a broken table)
            put(v.body, mine == null
                ? `<button class="hd-sit" type="button" data-sit="${i}" aria-label="${L(`Sit at seat ${i + 1}`, `坐 ${i + 1} 号位`)}"><b>+</b><span>${L("Sit", "入座")}</span></button>`
                : `<span class="hd-vacant" aria-hidden="true"><span>${L("Empty", "空位")}</span></span>`);
            put(v.holes, "");
            put(v.clock, "");
            return;
        }
        const name = seatName(seat, i);
        const tag = seat.bot ? `<span class="gd-avatar-tag">AI</span>` : me && k ? `<span class="gd-avatar-tag">${L("Me", "我")}</span>` : "";
        // my state tag rides in my plate (my cards sit over my avatar); others' hang under theirs
        put(v.body, `<div class="hd-av${me ? "" : " is-opp"}"><span class="hd-face">${faceHTML(seat, i)}</span>${tag}</div>
            <div class="hd-plate"><b class="hd-name">${esc(name)}</b><span class="hd-stack">${fmt(seat.stack)}</span>${k === 0 ? stateTag(seat, h) : ""}</div>
            ${k === 0 ? "" : stateTag(seat, h)}`);
        // cards: mine are the hero's big cards; others show backs while holding, faces when shown
        let holes = "";
        if (seat.shown && !(me && k === 0)) {
            holes = `<span class="hd-shown">${seat.shown.map((c, j) => card(c, `sh${i}${j}`, showdown ? (winCards.has(c) ? "is-win" : "is-dim") : "")).join("")}</span>`;
        } else if (seat.inHand && !me) {
            holes = `<span class="hd-backs">${ui.cardHTML({ back: true }, true)}${ui.cardHTML({ back: true }, true)}</span>`;
        }
        put(v.holes, holes);
        put(v.clock, toAct && !(me && k === 0) ? clockHTML(h.usingBank) : "");
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
        const total = pots.reduce((a, p) => a + p.amt, 0) + bets + (h.dead || 0);
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

    const PRESETS = { max: "max", pot: 1, p23: 2 / 3, p12: 1 / 2, min: "min" };
    function presetTo(f, b) {
        if (f in PRESETS) f = PRESETS[f];
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
            // a bet opens the street; over a bet already made (the big blind's option too) it is a raise
            const opened = (h.currentBet || 0) > 0;
            const raiseLabel = !lg.canRaise ? "" : b.min >= b.max ? L("All-in", "全下") : opened ? L("Raise", "加注") : L("Bet", "下注");
            const open = !!V.raise && !!b;
            stage.classList.toggle("is-raising", open);
            const value = open ? V.raise.value : 0;
            const third = !lg.canRaise ? ""
                : open ? pill("primary", "confirm", value >= b.max ? L("All-in", "全下") : opened ? L("Raise to", "加注到") : L("Bet", "下注"), fmt(value))
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
        stage.classList.remove("is-raising");
        region("raise", "");
        // after the hand: show my cards when the rules let me
        if (me?.canShow && h?.done) return region("actions", `<div class="hd-row">${pill("secondary", "show", L("Show cards", "亮牌"))}</div>`);
        // in the hand, not my turn: pre-action toggles, cleared whenever the bet to me changes; none once
        // everyone else is all in (the board is only run out)
        const rivals = !!seat && t.seats.some((s, i) => s && i !== me.seat && s.inHand && s.state === "playing");
        if (seat && seat.inHand && h && !h.done && seat.state === "playing" && rivals) {
            const toCall = Math.max(0, (h.currentBet || 0) - seat.bet);
            if (V.pre && V.pre.key !== preKey(h, V.pre.choice)) V.pre = null;
            const opts = [["checkfold", L("Check / Fold", "过牌/弃牌")], ["any", L("Call any", "跟任何注")],
                toCall ? ["call", `${L("Call", "跟注")} ${fmt(Math.min(toCall, seat.stack))}`] : ["check", L("Check", "过牌")]];
            return region("actions", `<div class="hd-row is-pre">${opts.map(([choice, label]) =>
                `<button class="btn hd-pre${V.pre?.choice === choice ? " is-on" : ""}" type="button" data-pre="${choice}" aria-pressed="${V.pre?.choice === choice}"><i aria-hidden="true"></i><span>${label}</span></button>`).join("")}</div>`);
        }
        region("actions", "");
    }

    // A pot fraction that comes to the same amount as the minimum, the maximum or a bigger fraction is disabled
    // (two lit presets for one amount read as a bug); only the preset last chosen is lit.
    function presetList(b) {
        const seen = new Set();
        return [["max", L("All-in", "全下")], ["pot", L("Pot", "1 池")], ["p23", L("2/3 pot", "⅔ 池")], ["p12", L("1/2 pot", "½ 池")], ["min", L("Min", "最小")]].map(([key, label]) => {
            const to = presetTo(key, b);
            const off = key !== "max" && key !== "min" && (to >= b.max || to <= b.min || seen.has(to));
            seen.add(to);
            return { key, label, to, off };
        });
    }

    function raisePanelHTML(b) {
        return `<div class="hd-raise-panel" role="group" aria-label="${L("Raise amount", "加注金额")}">
            <div class="hd-presets">${presetList(b).map(({ key, label, to, off }) =>
                `<button class="hd-preset${V.raise.preset === key ? " is-on" : ""}" type="button" data-preset="${key}"${off ? " disabled" : ""}><span>${label}</span><b>${short(to)}</b></button>`).join("")}</div>
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
        R.raise.querySelectorAll(".hd-preset").forEach(p => p.classList.toggle("is-on", p.dataset.preset === V.raise.preset));
        const conf = R.actions.querySelector('[data-act="confirm"]');
        if (conf) {
            conf.querySelector("b").textContent = fmt(V.raise.value);
            conf.querySelector("span").textContent = V.raise.value >= b.max ? L("All-in", "全下") : (S.table.hand?.currentBet || 0) > 0 ? L("Raise to", "加注到") : L("Bet", "下注");
        }
    }

    function setRaise(value, preset = null) {
        const lg = legal();
        if (!lg || !V.raise) return;
        const b = raiseBounds(lg);
        V.raise.value = Math.min(b.max, Math.max(b.min, Math.round(value)));
        V.raise.preset = preset;
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
        // a split pot is one pot shared; a main pot and a side pot won by different players is not
        const split = winners.some(w => winners.some(x => x.pot === w.pot && x.seat !== w.seat));
        region("word", word || split ? `<div class="hd-word-in">${word ? ui.wordHTML(word) : ""}${split ? `<small>${L("Split pot", "平分底池")}</small>` : ""}</div>` : "");
    }

    // the narrow portrait felt: the hand's word shrinks until it clears a winner's +amount beside it (stage px,
    // from layout sizes, so the word's pop-in animation does not skew the measure)
    function fitWord() {
        const el = R.word;
        el.style.scale = "";
        if (!V.portrait || !el.firstElementChild) return;
        const W = el.offsetWidth;
        const H = el.offsetHeight;
        const bottom = el.offsetTop;
        const cx = V.G.cx;
        let half = W / 2;
        V.bets.forEach(b => {
            if (!b.firstChild) return;
            const bx = parseFloat(b.style.left);
            const by = parseFloat(b.style.top);
            const bw = b.offsetWidth / 2;
            const bh = b.offsetHeight / 2;
            if (by + bh < bottom - H || by - bh > bottom) return;
            const room = (bx > cx ? bx - bw - cx : cx - bx - bw) - 14;
            if (room > 40) half = Math.min(half, room);
        });
        if (half < W / 2) el.style.scale = (half / (W / 2)).toFixed(3);
    }

    // landscape with the action pills up: my plate steps left of the 弃牌 pill when they would meet (a short stage)
    function clearHero(h, me) {
        const v = V.seats[0];
        if (!v) return;
        v.el.style.translate = "";
        if (V.portrait || !stage.classList.contains("is-acting")) return;
        const plate = v.body.querySelector(".hd-plate");
        const row = R.actions.firstElementChild;
        if (!plate || !row) return;
        const right = V.G.seats[0].x + plate.offsetWidth / 2;
        const left = R.actions.offsetLeft + row.offsetLeft;
        const shift = right + 16 - left;
        if (shift > 0) v.el.style.translate = `${-Math.ceil(shift)}px 0`;
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
            music ? ["music", icon("music"), music.isOn?.() && music.current?.() ? esc(L(`Music: ${music.current().short.en}`, `音乐：${music.current().short.zh}`)) : L("Music: off", "音乐：关")] : null,
            ["sfx", icon("sfx"), sfx.on ? L("Sound: on", "音效：开") : L("Sound: off", "音效：关")],
            seat ? ["topup", icon("chips"), L("Top up chips", "补充筹码")] : null,
            seat ? (seat.state === "out" ? ["back", icon("play"), L("I'm back", "回来")] : ["away", icon("pause"), L("Sit out", "暂离")]) : null,
            seat ? ["stand", icon("stand"), L("Stand up", "站起")] : null,
            ["lobby", icon("exit"), L("Back to lobby", "返回大厅")]
        ].filter(Boolean);
        // a short landscape screen has no room for one long column: two columns then
        const rowH = Math.max(54, 44 / V.s);
        const rows = 68 + 16 + items.length * rowH > V.h - 12 ? Math.ceil(items.length / 2) : items.length;
        return `<div class="gd-scrim"></div><div class="gd-menu${rows < items.length ? " is-cols" : ""}" role="menu" style="--rows: ${rows}">${items.map(([act2, ic, label], j) =>
            `<button type="button" role="menuitem" data-m="${act2}"${j === rows ? ' class="is-col-top"' : ""}>${ic}<span>${label}</span></button>`).join("")}</div>`;
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
            return setRaise(presetTo(f, raiseBounds(lg)), f);
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
        V.raise = { hand: S.table.hand.id, value: presetTo("min", raiseBounds(lg)), preset: "min" };
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
        if (m === "music") return ui.openMusic();
        if (m === "sfx") {
            sfx.set(!sfx.on);
            return ui.showToast(sfx.on ? L("Sound on", "音效已开启") : L("Sound off", "音效已关闭"));
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
            // dealt while I am looking; on arrival only a hand that has just begun with me in it (a practice table)
            const fresh = prev.table ? ph?.id !== h.id
                : !!S.me?.hole && t.seats.every(seat => !seat?.last || ["sb", "bb"].includes(seat.last.a));
            V.dealt = h.id;
            V.shownWin = "";
            V.lastAct.clear();
            V.labels.forEach(clearTimeout);
            V.labels.clear();
            V.seats.forEach(v => { v.label.innerHTML = ""; v.label.classList.remove("is-on"); });
            if (!reduced() && fresh && h.street === "preflop" && !h.board.length) dealIn(h, deckPt);
        }
        // once the hand is decided the action labels go (a fold, an all-in, a call are old news by then; a mucked
        // seat is dimmed and shows no cards, which says it)
        if (h?.done) V.seats.forEach(v => v.label.classList.remove("is-on"));
        // bets going in, labels for the actions just taken
        let betIn = false;
        t.seats.forEach((seat, i) => {
            if (!seat) return;
            const k = slotOf(i);
            const before = prev.table?.seats?.[i];
            const sameHand = ph && h && ph.id === h.id;
            if (motion && sameHand && ph.street === h.street && seat.bet > (before?.bet || 0)) {
                betIn = true;
                const bet = V.bets[k];
                bet.animate([{ transform: `translate(${(V.G.seats[k].x - V.G.seats[k].bx).toFixed(1)}px, ${(V.G.seats[k].y - V.G.seats[k].by).toFixed(1)}px) scale(.5)`, opacity: .2 }, { transform: "none", opacity: 1 }],
                    { duration: 240, easing: "cubic-bezier(.2, .8, .2, 1)" });
            }
            const lastKey = seat.last ? `${h?.id}:${seat.last.a}:${seat.last.amt ?? ""}:${h?.street}` : "";
            if (seat.last && V.lastAct.get(i) !== lastKey) {
                const show = !!prev.table && V.lastAct.has(i) || (!!prev.table && sameHand);
                V.lastAct.set(i, lastKey);
                // a new street with this seat's last action unchanged (all in, or a run-out) is not a new action
                const carried = sameHand && ph.street !== h.street && before?.last?.a === seat.last.a && before?.last?.amt === seat.last.amt;
                // an all-in shows as the seat's 全下 tag (one marker), a muck as the dimmed seat
                if (show && !carried && !h?.done && !["sb", "bb", "dead", "allin", "muck"].includes(seat.last.a)) showLabel(k, seat.last);
            }
        });
        if (betIn) sound("bet");
        // a street ends: the bets slide into the pot
        if (motion && ph && h && ph.id === h.id && (ph.street !== h.street || (!ph.done && h.done))) {
            if (prev.table.seats.some(seat => seat?.bet)) sound("collect", 120);
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
        // new board cards turn over in their slots; on the flop the two open slots and the end of the PICASSO print
        // wait for the first card's turn (outlines alone over the print looked like a glitch)
        const before = ph && h && ph.id === h.id ? ph.board.length : h && h.id !== ph?.id ? 0 : h?.board.length || 0;
        if (motion && h && h.board.length > before) {
            const lead = ph?.street !== h.street ? 380 : 0;
            [...R.board.querySelectorAll(".hd-slot .card")].slice(before).forEach((el, j) => {
                sound("board", 120 * j + lead);
                el.animate([{ transform: "translateY(-18px) scaleX(0)", opacity: .4 }, { transform: "translateY(-6px) scaleX(.15)", opacity: 1, offset: .35 }, { transform: "none", opacity: 1 }],
                    { duration: 340, delay: 120 * j + lead, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "backwards" });
            });
            if (!before) {
                R.board.querySelectorAll(".hd-slot.is-open").forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: lead + 120 * h.board.length, easing: "ease-out", fill: "backwards" }));
                R.mark.animate([{ opacity: 1 }, { opacity: 1, offset: lead / (lead + 350) }, { opacity: 0 }], { duration: lead + 350, easing: "ease-out" });
            }
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
        sound("deal");
        sound("deal", step * order.length);
        const heroCards = [...R.hero.querySelectorAll(".hd-hole .card")];
        heroCards.forEach(el => { el.style.opacity = "0"; });
        V.seats.forEach(v => v.holes.classList.add("is-dealing"));
        let last = 0;
        [0, 1].forEach(round => order.forEach((i, j) => {
            const k = slotOf(i);
            const delay = (round * order.length + j) * step;
            last = delay;
            const backs = V.seats[k].holes.querySelectorAll(".hd-backs .card");
            const target = k === 0 && heroCards[round] ? heroCards[round] : backs[round] || V.seats[k].holes;
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
        // restart the pop only when a label is already showing (a forced layout otherwise costs a frame)
        if (v.label.classList.contains("is-on")) {
            v.label.classList.remove("is-on");
            void v.label.offsetWidth;
        }
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
            fly(chipsHTML(w.amt, bb, total >= BIG_POT_BB * bb ? 5 : 3), from, { x: p.bx, y: p.by }, { ms: 520, delay: wait + j * 160, fade: true, cls: "is-win" });
            if (!j) sound("win", wait + 380);
            V.bets[k].animate([{ transform: "translateY(10px) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, delay: wait + 420 + j * 160, easing: "cubic-bezier(.34, 1.4, .64, 1)", fill: "backwards" });
        });
        const word = R.word.querySelector(".hd-word-in");
        if (word) word.animate([{ transform: "scale(1.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 260, delay: wait - 150, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "backwards" });
        // quads and better: Guandan's gold rays and sparks only, half the board wide, behind the cards and centred
        // on the hand's word (a big pot shows through its bigger chip flight instead)
        const top = h.winners.find(w => w.hand);
        const cat = top ? handCat(top.hand) : "";
        if (["quads", "straight_flush", "royal"].includes(cat) && !reduced()) {
            const wordEl = R.word.querySelector(".hd-word-in");
            const at = wordEl ? centreOf(wordEl) : { x: V.G.cx, y: V.G.boardY - 120 };
            setTimeout(() => {
                if (V.destroyed) return;
                fxUnder.insertAdjacentHTML("beforeend", ui.burstHTML("flush", "", at.x, at.y));
                const set = fxUnder.lastElementChild;
                setTimeout(() => set.remove(), 1500);
            }, wait - 100);
        }
    }

    // ---------- lifecycle ----------
    // a sound for this table, later by delay ms (not once the table is gone)
    function sound(name, delay = 0) {
        if (delay) return setTimeout(() => { if (!V.destroyed) sfx.play(name); }, delay);
        if (!V.destroyed) sfx.play(name);
    }

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
    sfx.load();

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
                // the pill stays until a fresh snapshot clears the stale table (update)
                region("status", status !== "online" || V.stale ? `<span>${L("Reconnecting…", "重新连接中…")}</span>` : "");
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
