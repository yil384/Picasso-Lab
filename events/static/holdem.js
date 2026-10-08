// Texas Hold'em inside the Guandan page: the controller (one table at a time over holdem-net.js), the waiting room
// (hroom, Guandan's room screen), the popups (buy-in, top-up, rules with the hand ranking, last hand) and the
// ranking page. The table itself is holdem-table.js (htable). The dealer service is the only authority: this file
// renders snapshots and sends the player's own decisions (DESIGN.md §6). Play money only.
import { createSocket } from "https://yil384.github.io/Picasso-Lab/events/static/holdem-net.js";
import { createTable } from "https://yil384.github.io/Picasso-Lab/events/static/holdem-table.js";
import { toCard, fmt, catName, CAT_ORDER, handLabel, seatName, botMark, BLIND_PRESETS } from "https://yil384.github.io/Picasso-Lab/events/static/holdem-common.js";

const DEFAULT_SETTINGS = { blinds: "10/20", seats: 6, actionSec: 20, timeBankSec: 30 };
const START_TIMEOUT_MS = 9000;
const REFILL_BELOW = 2000;

const ERRORS = {
    not_your_turn: ["It is not your turn", "还没轮到你"],
    stale_hand: ["That hand is already over", "这一手已经结束"],
    bad_amount: ["That amount is not allowed", "金额不合法"],
    illegal_action: ["That move is not allowed now", "现在不能这样操作"],
    seat_taken: ["That seat was just taken", "这个座位刚被人坐了"],
    already_seated: ["You already have a seat", "你已经入座了"],
    no_table: ["This table does not exist or has closed", "牌桌不存在或已解散"],
    closed: ["This table has closed", "牌桌已关闭"],
    insufficient_chips: ["Not enough chips", "筹码不足"],
    name_protected: ["That name belongs to a saved account. Change your name to sit", "这个昵称已被绑定邮箱的玩家使用，改个昵称再入座"],
    not_host: ["Only the host can do that", "只有房主可以操作"],
    not_enough_players: ["At least 2 players are needed", "至少需要 2 位玩家入座"],
    table_full: ["The table is full", "牌桌已满"],
    cannot_show: ["Nothing to show", "现在不能亮牌"],
    not_waiting: ["The game has already started", "牌局已经开始"],
    rate_limited: ["Too fast, slow down a little", "操作太快了"],
    too_many_tables: ["You already host 3 open tables", "你已经开了 3 张牌桌，先解散一张"],
    too_many_tables_net: ["Too many tables are open from this network. Try again later", "这个网络开的牌桌太多了，稍后再试"],
    too_many_seats: ["You already sit at 4 tables. Leave one first", "你已经坐在 4 张牌桌上了，先离开一张"],
    too_many_misses: ["Too many wrong table codes from this network today", "这个网络今天输错房间号的次数太多了"],
    restarting: ["The table service is restarting. Try again in a moment", "牌桌服务正在重启，请稍后再试"],
    bad_seat: ["That seat does not exist", "没有这个座位"],
    not_seated: ["You are not seated", "你还没有入座"],
    bad_phase: ["Not possible right now", "现在不能这样操作"],
    server_error: ["Something went wrong at the table service", "牌桌服务出错了，请稍后再试"]
};

export function mountHoldem(ui) {
    const { L, encodeHTML: esc } = ui;
    const S = {
        screen: null,      // "hroom" | "htable" while a Hold'em screen is up
        code: "", table: null, me: null, rev: 0, offset: 0,
        net: null, status: "closed",
        starting: null,    // { kind, invite, resolve } until the first snapshot
        autoSit: false,    // a fresh friends table: the host sits at seat 0
        rebuyOffered: "",
        pending: ""        // the room control waiting for the service
    };
    let table = null;      // holdem-table.js while the table screen is mounted
    let roomEl = null;

    // ---------- the socket ----------
    function socket() {
        S.net ||= createSocket({
            origin: ui.origin,
            token: () => ui.account?.token() || "",
            onMessage,
            onStatus: status => {
                S.status = status;
                table?.setStatus(status);
            }
        });
        return S.net;
    }

    function onMessage(msg) {
        if (msg.t === "welcome" || msg.t === "account") {
            if (msg.account) ui.account?.setAccount(msg.account);
            // a new socket takes the next snapshot whatever its rev: a service restored after a crash can be a
            // few changes behind what this page had seen, and its table is the truth
            if (msg.t === "welcome") S.rev = 0;
            if (S.screen === "hroom") renderRoom();
        } else if (msg.t === "created") {
            S.code = msg.code;
            socket().watch(msg.code);
        } else if (msg.t === "state") {
            onState(msg);
        } else if (msg.t === "error") {
            onError(msg);
        } else if (msg.t === "closed") {
            close(msg.reason === "dissolved" ? L("The host dissolved the table", "房主已解散牌桌") : L("The table closed", "牌桌已关闭"));
        }
    }

    function onState(msg) {
        const t = msg.table;
        if (!t || (S.code && t.code !== S.code)) return;
        if (S.table?.code === t.code && msg.rev <= S.rev) return;
        const prev = { table: S.table, me: S.me };
        S.rev = msg.rev;
        S.offset = (msg.serverTime || Date.now()) - Date.now();
        S.table = t;
        S.me = msg.me;
        S.code = t.code;
        S.pending = "";
        if (t.phase === "closed") return close(L("The table closed", "牌桌已关闭"));
        // the service restarted while this page was in a hand: that hand was called off and every chip went back
        const was = prev.table?.code === t.code ? prev.table.hand : null;
        if (t.voided && was && !was.done && was.no === t.voided && S.voidSeen !== `${t.code}:${t.voided}`) {
            S.voidSeen = `${t.code}:${t.voided}`;
            ui.showToast(L(`The table service restarted: hand ${t.voided} was called off and every chip went back`, `牌桌服务重启了，第 ${t.voided} 手已取消，下注的筹码已全部退回`), 3600);
        }
        if (S.starting) {
            const { invite, resolve } = S.starting;
            S.starting = null;
            clearTimeout(S.startTimer);
            ui.setRoomURL(t.code);
            render(prev);
            resolve();
            if (invite) inviteLink();
            if (S.autoSit && S.me?.seat == null) {
                S.autoSit = false;
                const buyIn = defaultBuyIn();
                if (buyIn) send({ t: "sit", seat: 0, buyIn });
                else openBuyIn(0);
            }
            return;
        }
        render(prev);
    }

    function onError(msg) {
        S.pending = "";
        if (S.starting && (msg.re === "watch" || msg.re === "create")) return failStart(msg.code);
        if (msg.re === "hello") {
            ui.account?.retry().then(() => S.net?.reconnect());
            return;
        }
        table?.actionFailed(msg);
        if (S.screen === "hroom") renderRoom();
        const text = ERRORS[msg.code];
        ui.showToast(text ? L(text[0], text[1]) : L("That did not work. Try again", "操作没有成功，请重试"), 2200);
    }

    function send(msg) {
        if (socket().send(msg)) return true;
        ui.showToast(L("Reconnecting…", "重新连接中…"));
        return false;
    }

    // ---------- start / leave ----------
    function down() {
        ui.showToast(L("The table service is unavailable. Try again later", "牌桌服务暂不可用，稍后再试"), 2400);
    }

    function failStart(code) {
        const start = S.starting;
        S.starting = null;
        clearTimeout(S.startTimer);
        S.net?.close();
        S.net = null;
        S.code = "";
        const text = code === "insufficient_chips" ? ["Not enough chips to sit. Tap your photo to get free chips", "筹码不足，点头像在账号页领取筹码"]
            : code === "closed" ? ERRORS.no_table : ERRORS[code];
        if (text) ui.showToast(L(text[0], text[1]), 2600);
        else down();
        start?.resolve();
    }

    async function start(kind, { code = "", invite = false } = {}) {
        if (S.starting) return;
        const ready = await ui.accountReady().catch(() => false);
        if (!ready || !ui.account?.token()) return down();
        const net = socket();
        try {
            await net.ready();
        } catch (_) {
            net.close();
            S.net = null;
            return down();
        }
        S.table = null;
        S.me = null;
        S.rev = 0;
        S.code = kind === "join" ? code : "";
        S.autoSit = kind === "create";
        return new Promise(resolve => {
            S.starting = { kind, invite, resolve };
            S.startTimer = setTimeout(() => failStart("timeout"), START_TIMEOUT_MS);
            if (kind === "join") net.watch(code);
            else net.send({ t: "create", settings: { ...DEFAULT_SETTINGS }, practice: kind === "practice" });
        });
    }

    // Back to the lobby. A message (dissolved / closed) is shown there.
    function close(message) {
        S.screen = null;
        S.starting = null;
        S.net?.close();
        S.net = null;
        S.table = null;
        S.me = null;
        S.code = "";
        S.rev = 0;
        table?.destroy();
        table = null;
        roomEl = null;
        ui.showLobby();
        if (message) ui.showToast(message, 2400);
    }

    // ↩ / 返回大厅: the seat goes back first (a live hand is folded by the service); chips return to the bankroll.
    async function leave() {
        const seated = S.me?.seat != null;
        if (seated && S.table?.phase === "running" && S.table.seats[S.me.seat]?.inHand && !S.table.hand?.done) {
            const ok = await ui.confirmPopup({
                title: L("Leave the table", "离开牌桌"),
                text: L("You are in this hand: leaving folds it. Your chips go back to your bankroll.", "你还在这一手牌里，离开会弃牌，剩余筹码回到你的账户。"),
                ok: L("Leave", "离开")
            });
            if (!ok) return;
        }
        if (seated) send({ t: "stand" });
        setTimeout(() => close(), seated ? 150 : 0);
    }

    // The picasso egg leaves for the Events page: a waiting room gets its seat back, a running table keeps it
    // (it times out and is stood up after a while, like a dropped phone).
    function release() {
        if (S.screen === "hroom" && S.me?.seat != null) send({ t: "stand" });
        return new Promise(resolve => setTimeout(resolve, 200));
    }

    // ---------- screens ----------
    function render(prev = { table: null, me: null }) {
        if (!S.table) return;
        const screen = S.table.phase === "waiting" ? "hroom" : "htable";
        if (screen !== S.screen) {
            table?.destroy();
            table = null;
            roomEl = null;
            S.screen = screen;
            ui.hideToast();
        }
        if (screen === "hroom") return renderRoom();
        ui.enterScreen("htable");
        if (!table) {
            table = createTable({ ui, S, send, popups: { openBuyIn, openTopUp, openRules, openLastHand, openBoard, invite: inviteLink, leave, closeTable: close } });
            table.setStatus(S.status);
        }
        table.update(prev);
        maybeOfferRebuy();
    }

    function bankroll() {
        return S.me?.chips ?? ui.account?.account?.chips ?? 0;
    }

    function defaultBuyIn() {
        const st = S.table?.settings;
        if (!st) return 0;
        const chips = bankroll();
        return chips >= st.minBuyIn ? Math.min(st.maxBuyIn, chips) : 0;
    }

    function isHost() {
        return !!S.table && !!S.me && S.table.host === S.me.pid;
    }

    // ---------- room (hroom): Guandan's room with a 2-9 seat ring ----------
    function titleHTML() {
        return `<div class="hud-title"><b>${L("Hold'em Table", "德州好友桌")}</b><span>${L("Code", "房间号")} <em>${esc(S.code)}</em></span></div>`;
    }

    function blindsKey(st) {
        return `${st.sb}/${st.bb}`;
    }

    function settingsRows() {
        const st = S.table.settings;
        const host = isHost();
        const row = (key, value, note = "") => `<div class="room-row"><span class="room-k">${key}</span><span class="room-v">${value}${note ? `<small>${note}</small>` : ""}</span></div>`;
        const pills = (name, options, current) => `<div class="hd-pills" role="radiogroup">${options.map(([value, label]) =>
            `<button class="hd-pill" type="button" role="radio" data-set="${name}" data-v="${value}" aria-checked="${String(value) === String(current)}">${label}</button>`).join("")}</div>`;
        const blinds = blindsKey(st);
        const seats = host
            ? `<div class="room-step" role="group" aria-label="${L("Seats", "座位")}">
                <button class="room-step-btn" type="button" data-set="seats" data-v="${st.seats - 1}" aria-label="${L("Fewer seats", "减少座位")}"${st.seats <= 2 ? " disabled" : ""}>‹</button>
                <b class="room-step-v hd-step-v">${st.seats}</b>
                <button class="room-step-btn" type="button" data-set="seats" data-v="${st.seats + 1}" aria-label="${L("More seats", "增加座位")}"${st.seats >= 9 ? " disabled" : ""}>›</button>
            </div>`
            : L(`${st.seats} seats`, `${st.seats} 人桌`);
        return [
            `<div class="room-row is-pills"><span class="room-k">${L("Blinds", "盲注")}</span>${host ? pills("blinds", BLIND_PRESETS.map(b => [b, b]), blinds) : `<span class="room-v hd-num">${blinds}</span>`}</div>`,
            `<div class="room-row is-level"><span class="room-k">${L("Seats", "座位")}</span>${host ? seats : `<span class="room-v">${seats}</span>`}</div>`,
            row(L("Buy-in", "买入"), "40 – 100 BB", `${fmt(st.minBuyIn)} – ${fmt(st.maxBuyIn)}`),
            `<div class="room-row is-pills"><span class="room-k">${L("Timer", "思考时间")}</span>${host ? pills("actionSec", [15, 20, 30].map(v => [v, L(`${v} s`, `${v} 秒`)]), st.actionSec) : `<span class="room-v">${L(`${st.actionSec} s`, `${st.actionSec} 秒`)}</span>`}</div>`,
            row(L("Time bank", "时间银行"), L(`${st.timeBankSec} s`, `${st.timeBankSec} 秒`), L("+5 s every 10 hands", "每 10 手 +5 秒"))
        ].join("");
    }

    // Seats around the mini felt, clockwise from my seat at the bottom (seat 0 when I am not seated).
    function roomSeatPos(i, n) {
        const mine = S.me?.seat ?? 0;
        const k = (i - mine + n) % n;
        const a = (90 + k * 360 / n) * Math.PI / 180;
        return { x: 50 + 53 * Math.cos(a), y: 50 + 60 * Math.sin(a) };
    }

    function faceHTML(seat) {
        if (seat.bot) return ui.defaultFaceHTML(botMark(seat, L));
        const photo = ui.seatMemberPhoto(seat.name);
        return photo ? `<img src="${esc(photo)}" alt="">` : ui.defaultFaceHTML();
    }

    function roomSeatHTML(seat, i) {
        const n = S.table.settings.seats;
        const p = roomSeatPos(i, n);
        const style = `style="left:${p.x.toFixed(2)}%;top:${p.y.toFixed(2)}%"`;
        const mine = S.me?.seat;
        const busy = S.pending ? " disabled" : "";
        if (!seat) {
            return `<div class="hd-rseat is-empty" ${style}><span class="room-seat-disc"><button class="room-seat-sit" type="button" data-sit="${i}"${busy} aria-label="${L(`Sit at seat ${i + 1}`, `坐 ${i + 1} 号位`)}"><b>+</b><span>${L("Sit", "入座")}</span></button></span></div>`;
        }
        const me = mine === i;
        const name = seatName(seat, L);
        const tag = seat.bot ? "AI" : me ? L("Me", "我") : "";
        const host = S.table.host === seat.pid;
        const clear = seat.bot && isHost()
            ? `<button class="room-badge is-remove" type="button" data-remove="${i}"${busy} aria-label="${esc(L(`Remove ${name}`, `移除 ${name}`))}">${ui.glyphHTML("close")}</button>`
            : me ? `<button class="room-badge is-leave" type="button" data-stand${busy} aria-label="${L("Leave the seat", "离开座位")}">${ui.glyphHTML("close")}</button>` : "";
        return `<div class="hd-rseat${me ? " is-me" : ""}${seat.bot ? " is-ai" : ""}" ${style}>
            <span class="room-seat-disc">
                <span class="gd-avatar room-seat-av${me ? "" : " is-opp"}">${faceHTML(seat)}${tag ? `<span class="gd-avatar-tag">${tag}</span>` : ""}</span>
                ${host ? `<span class="room-seat-host">${L("Host", "房主")}</span>` : ""}${clear}
            </span>
            <span class="room-seat-plate hd-rplate"><b>${esc(name)}</b><em>${fmt(seat.stack)}</em></span>
        </div>`;
    }

    function roomActionsHTML() {
        const seated = S.table.seats.filter(Boolean).length;
        if (!isHost()) {
            return S.me?.seat == null
                ? `<span class="room-wait">${L("Pick a seat to join", "选一个座位入座")}</span>`
                : `<span class="room-wait">${L("Waiting for the host…", "等待房主开始…")}</span>`;
        }
        const open = S.table.seats.some(s => !s);
        const starting = S.pending === "start";
        return `<button class="btn secondary" type="button" data-host="fillBots"${!open || S.pending ? " disabled" : ""}>${L("Add AI", "AI 补位")}</button>
            <button class="btn lg${starting ? " is-loading" : ""}" type="button" data-host="start"${seated < 2 || S.pending ? " disabled" : ""}>${starting ? L("Dealing…", "正在开局…") : L("Start", "开始游戏")}</button>`;
    }

    function rosterHTML() {
        const PL = ui.labPlayers();
        const seated = new Set(S.table.seats.filter(s => s && !s.bot).map(s => ui.labPlayerKey(s.name)).filter(Boolean));
        return ui.labMemberKeys().map(k => {
            const p = PL[k];
            const red = /[♥♦]/.test(p.card);
            return `<div class="roster-row">
                <span class="gd-avatar is-plain roster-av"><img src="${esc(p.avatar)}" alt="" loading="lazy"></span>
                <span class="roster-name"><b>${esc(ui.firstNameOf(p.name))}</b><small><i class="${red ? "is-red" : ""}">${esc(p.card)}</i></small></span>
                ${seated.has(k) ? `<span class="roster-in">${L("Seated", "已入座")}</span>` : `<button class="roster-invite" type="button" data-invite>${L("Invite", "邀请")}</button>`}
            </div>`;
        }).join("");
    }

    function renderRoom() {
        ui.enterScreen("hroom");
        ui.updateTopbarStatus();
        const key = `${S.code}:${ui.lang()}`;
        if (!roomEl?.isConnected || roomEl.dataset.key !== key) {
            ui.root.innerHTML = `<section class="room hd-room">
                <aside class="room-panel room-settings">
                    <h3 class="room-panel-head">${L("Table settings", "牌桌设置")}</h3>
                    <div class="room-panel-body"><div class="hd-settings" data-region="settings"></div><div class="room-admin" data-region="admin"></div></div>
                </aside>
                <div class="room-center">
                    <div class="room-table hd-room-table">
                        <div class="hd-room-board" data-region="board"></div>
                        <div class="room-actions" data-region="actions"></div>
                    </div>
                </div>
                <aside class="room-panel room-roster">
                    <h3 class="room-panel-head">${L("Lab members", "实验室成员")}</h3>
                    <div class="room-roster-list" data-region="roster"></div>
                    <div class="room-roster-foot"><button class="btn ok" type="button" data-invite>${L("Invite friends", "邀请好友")}</button></div>
                </aside>
            </section>`;
            roomEl = ui.root.querySelector(".hd-room");
            roomEl.dataset.key = key;
            roomEl.addEventListener("click", onRoomClick);
        }
        const st = S.table.settings;
        const patch = (name, html) => {
            const el = roomEl.querySelector(`[data-region="${name}"]`);
            if (el.dataset.html !== html) {
                el.dataset.html = html;
                el.innerHTML = html;
            }
        };
        patch("settings", settingsRows());
        patch("admin", isHost() ? `<button class="room-dissolve" type="button" data-host="dissolve"${S.pending ? " disabled" : ""}><span class="btn danger">${L("Dissolve table", "解散牌桌")}</span></button>` : "");
        patch("board", `<div class="room-felt"><div class="room-felt-mark">PICASSO ${L("Hold'em", "德州")} · ${blindsKey(st)}</div><div class="hd-room-count">${L(`${S.table.seats.filter(Boolean).length} / ${st.seats} seated`, `${S.table.seats.filter(Boolean).length} / ${st.seats} 人入座`)}</div></div>
            ${S.table.seats.map(roomSeatHTML).join("")}`);
        const board = roomEl.querySelector(".hd-room-board");
        board.style.setProperty("--n", st.seats);
        board.classList.toggle("is-crowded", st.seats >= 8);
        patch("actions", roomActionsHTML());
        patch("roster", rosterHTML());
    }

    function hostSettings(change) {
        const st = S.table.settings;
        const settings = { blinds: blindsKey(st), seats: st.seats, actionSec: st.actionSec, timeBankSec: st.timeBankSec, ...change };
        send({ t: "host", op: "settings", settings });
    }

    async function onRoomClick(event) {
        const btn = event.target.closest("button");
        if (!btn || btn.disabled) return;
        if (btn.hasAttribute("data-invite")) return inviteLink();
        if (btn.dataset.set) {
            const v = btn.dataset.set === "blinds" ? btn.dataset.v : Number(btn.dataset.v);
            return hostSettings({ [btn.dataset.set]: v });
        }
        if (btn.dataset.sit != null) {
            const seat = Number(btn.dataset.sit);
            if (S.me?.seat != null) {
                // moving: the stack goes back to the bankroll and comes along to the new seat
                const stack = S.table.seats[S.me.seat]?.stack || 0;
                send({ t: "stand" });
                return setTimeout(() => send({ t: "sit", seat, buyIn: Math.min(S.table.settings.maxBuyIn, Math.max(S.table.settings.minBuyIn, stack)) }), 120);
            }
            return openBuyIn(seat);
        }
        if (btn.hasAttribute("data-stand")) return send({ t: "stand" });
        if (btn.dataset.remove != null) return send({ t: "host", op: "removeBot", seat: Number(btn.dataset.remove) });
        const op = btn.dataset.host;
        if (op === "dissolve") {
            const ok = await ui.confirmPopup({
                title: L("Dissolve table", "解散牌桌"),
                text: L("Dissolve this table? Everyone at it goes back to the lobby.", "确定解散牌桌吗？桌上的玩家都会回到大厅。"),
                ok: L("Dissolve", "解散")
            });
            if (ok) send({ t: "host", op: "dissolve" });
            return;
        }
        if (op) {
            S.pending = op;
            renderRoom();
            send({ t: "host", op });
            setTimeout(() => { if (S.pending === op) { S.pending = ""; if (S.screen === "hroom") renderRoom(); } }, 2500);
        }
    }

    // ---------- invite ----------
    async function inviteLink() {
        if (!S.code) return;
        const url = `${ui.inviteBase}?game=holdem&room=${S.code}`;
        try {
            await navigator.clipboard.writeText(url);
            ui.showToast(L("Table link copied", "牌桌链接已复制"));
        } catch (_) {
            ui.showToast(L(`Table code ${S.code}`, `房间号 ${S.code}`), 3200);
        }
    }

    // ---------- buy-in / top-up (Tencent popup: amount, slider, presets) ----------
    function amountPopup({ title, min, max, start, step, note, ok, onOk, refill }) {
        const chips = bankroll();
        const can = max >= min;
        const value = Math.min(max, Math.max(min, start));
        // 最小 / 100 BB / 最大, or 50 BB (25 BB) in the middle when 100 BB is not strictly between the two
        const mid = [100, 50, 25].find(k => step * k > min && step * k < max);
        const presets = can ? [[L("Min", "最小"), min], ...(mid ? [[`${mid} BB`, step * mid]] : []), [L("Max", "最大"), max]] : [];
        const close = ui.openPopup({
            title,
            narrow: true,
            html: `<div class="hd-amount">
                <div class="hd-amount-bank"><span>${L("Your chips", "我的筹码")}</span><b><i class="ga-coin" aria-hidden="true"></i>${fmt(chips)}</b></div>
                ${can ? `<output class="hd-amount-v">${fmt(value)}</output>
                <input class="hd-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(title)}">
                <div class="hd-amount-presets" role="radiogroup">${presets.map(([label, v]) => `<button class="hd-pill" type="button" role="radio" data-v="${v}" aria-checked="${v === value}">${label}</button>`).join("")}</div>
                <p class="hd-amount-note">${note}</p>
                <div class="gd-confirm-row"><button class="btn secondary" type="button" data-cancel>${L("Cancel", "取消")}</button><button class="btn primary" type="button" data-ok>${ok}</button></div>`
                : `<p class="gd-confirm-text">${L("Not enough chips for this table.", "筹码不够这张桌的最小买入。")}</p>
                <div class="gd-confirm-row">${refill && chips < REFILL_BELOW ? `<button class="btn ok" type="button" data-refill>${L("Get chips", "领取筹码")}</button>` : `<button class="btn secondary" type="button" data-cancel>${L("OK", "知道了")}</button>`}</div>`}
            </div>`
        });
        const panel = close.panel;
        const range = panel.querySelector(".hd-range");
        const out = panel.querySelector(".hd-amount-v");
        // the preset matching the amount is lit, like the raise presets
        const show = () => {
            if (out) out.textContent = fmt(range.value);
            panel.querySelectorAll(".hd-amount-presets [data-v]").forEach(p => p.setAttribute("aria-checked", String(Number(p.dataset.v) === Number(range.value))));
        };
        range?.addEventListener("input", show);
        panel.addEventListener("click", async event => {
            const btn = event.target.closest("button");
            if (!btn) return;
            if (btn.dataset.v) {
                range.value = btn.dataset.v;
                show();
            } else if (btn.hasAttribute("data-cancel")) {
                close();
            } else if (btn.hasAttribute("data-ok")) {
                onOk(Number(range.value));
                close();
            } else if (btn.hasAttribute("data-refill")) {
                btn.disabled = true;
                try {
                    ui.account.setAccount((await ui.account.request("/refill", {})).account);
                    close();
                    refill();
                } catch (err) {
                    btn.disabled = false;
                    ui.showToast(err && err.code === "refill_later" ? L("One refill a day. Try again tomorrow", "每天只能领取一次，明天再来")
                        : L("Available below 2,000 chips with nothing at a table", "筹码低于 2,000 且不在牌桌上时才能领取"), 2400);
                }
            }
        });
        return close;
    }

    function openBuyIn(seat) {
        const st = S.table.settings;
        const chips = bankroll();
        amountPopup({
            title: L("Buy in", "买入"),
            min: st.minBuyIn,
            max: Math.min(st.maxBuyIn, chips),
            start: Math.min(st.maxBuyIn, chips),
            step: st.bb,
            note: L(`40 – 100 big blinds (${fmt(st.minBuyIn)} – ${fmt(st.maxBuyIn)}). Play money only.`, `买入 40 – 100 个大盲（${fmt(st.minBuyIn)} – ${fmt(st.maxBuyIn)}），筹码均为虚拟。`),
            ok: L("Sit down", "入座"),
            onOk: buyIn => send({ t: "sit", seat, buyIn }),
            refill: () => openBuyIn(seat)
        });
    }

    function openTopUp(busted = false) {
        const st = S.table.settings;
        const seat = S.table.seats[S.me?.seat];
        if (!seat) return;
        const room = st.maxBuyIn - seat.stack - (S.me.pendingTopUp || 0);
        if (room <= 0) return ui.showToast(L("Your stack is already at the maximum", "你的筹码已到买入上限"));
        const chips = bankroll();
        const min = busted ? st.minBuyIn : st.bb;
        amountPopup({
            title: busted ? L("Rebuy", "补充筹码") : L("Top up", "补充筹码"),
            min: Math.min(min, room),
            max: Math.min(room, chips),
            start: Math.min(room, chips),
            step: st.bb,
            note: busted ? L("You are out of chips. A rebuy joins your stack before the next hand.", "你的筹码用完了，补充后从下一手开始。")
                : L("Added between hands, up to 100 big blinds.", "在两手牌之间补入，最多到 100 个大盲。"),
            ok: L("Add", "补充"),
            onOk: amount => send({ t: "topUp", amount }),
            refill: () => openTopUp(busted)
        });
    }

    function maybeOfferRebuy() {
        const seat = S.table?.seats[S.me?.seat];
        const key = `${S.code}:${S.table?.hand?.id || ""}`;
        if (!seat || seat.state !== "busted" || S.me.pendingTopUp || S.rebuyOffered === key) return;
        S.rebuyOffered = key;
        openTopUp(true);
    }

    // ---------- rules with the hand ranking (Guandan's tabbed rules popup) ----------
    function cards(list, cls = "") {
        return `<span class="gd-rules-cards${cls ? ` ${cls}` : ""}">${list.map((c, i) => ui.cardHTML(toCard(c, `rx${i}${c}`), true)).join("")}</span>`;
    }

    const RANKING = {
        royal: [["As", "Ks", "Qs", "Js", "Ts"], ["Ten to ace, one suit", "同一花色的 10 J Q K A"]],
        straight_flush: [["9h", "8h", "7h", "6h", "5h"], ["Five in a row, one suit", "同一花色的五张连牌"]],
        quads: [["Qc", "Qd", "Qh", "Qs", "7d"], ["Four of a rank", "四张同点数"]],
        full_house: [["Kd", "Ks", "Kh", "8c", "8d"], ["Three of a rank and a pair", "三张同点数加一对"]],
        flush: [["Ad", "Jd", "9d", "6d", "3d"], ["Five of one suit", "五张同花色"]],
        straight: [["Tc", "9d", "8s", "7h", "6c"], ["Five in a row (A-2-3-4-5 is the lowest)", "五张连牌（A-2-3-4-5 最小）"]],
        trips: [["7s", "7h", "7d", "Kc", "2d"], ["Three of a rank", "三张同点数"]],
        two_pair: [["Jh", "Jc", "4s", "4d", "Ac"], ["Two pairs", "两个对子"]],
        pair: [["Ah", "As", "Qd", "8c", "5s"], ["Two of a rank", "两张同点数"]],
        high: [["Ac", "Qd", "9h", "6s", "3c"], ["None of the above: the highest card decides", "以上都不是，比最大的单张"]]
    };

    function rankingHTML() {
        return CAT_ORDER.map(cat => {
            const [list, [en, zh]] = RANKING[cat];
            return `<div class="gd-rules-row has-cards hd-rank-row"><b>${catName(cat, L)}</b><span>${L(en, zh)}</span>${cards(list)}</div>`;
        }).join("");
    }

    function rulesTabs() {
        const st = S.table?.settings || { sb: 10, bb: 20, actionSec: 20, timeBankSec: 30 };
        const row = (k, text, list) => `<div class="gd-rules-row${list ? " has-cards" : ""}"><b>${k}</b><span>${text}</span>${list ? cards(list) : ""}</div>`;
        return [
            [L("Basics", "基本玩法"), [
                row(L("Goal", "目标"), L("Win the chips in the pot: hold the best five-card hand at the showdown, or make everyone else fold.", "赢下底池：摊牌时组成最大的五张牌，或者让其他人都弃牌。")),
                row(L("Cards", "发牌"), L("Everyone gets two hole cards; five community cards come face up: three on the flop, one on the turn, one on the river.", "每人两张底牌；五张公共牌依次翻开：翻牌三张、转牌一张、河牌一张。"), ["Ah", "Kd"]),
                row(L("Best five", "组牌"), L("Use any five of your two cards and the five on the board. The board alone may play.", "用两张底牌和五张公共牌中的任意五张组牌，也可以只用公共牌。")),
                row(L("Seats", "座位"), L("2 to 9 players. The dealer button moves one seat to the left every hand.", "2 到 9 人一桌，庄家按钮每手向左移一位。"))
            ]],
            [L("Betting", "下注"), [
                row(L("Blinds", "盲注"), L(`The two seats left of the button post the small and big blind (this table: ${st.sb}/${st.bb}).`, `庄家左边两位先下小盲和大盲（本桌 ${st.sb}/${st.bb}）。`)),
                row(L("Rounds", "轮次"), L("Four betting rounds: pre-flop (starting left of the big blind), flop, turn and river (starting left of the button).", "四轮下注：翻牌前（从大盲左边开始）、翻牌、转牌、河牌（从庄家左边开始）。")),
                row(L("Moves", "操作"), L("Fold, check (nothing to call), call, bet or raise. No limit: you may go all-in at any time.", "弃牌、过牌（无人下注时）、跟注、下注或加注。无限注：随时可以全下。")),
                row(L("Raise", "加注"), L("A raise is at least the size of the last bet or raise. An all-in that is not a full raise does not reopen the betting.", "加注至少要加上一次下注或加注的大小；不足一次完整加注的全下不会重新开放加注。")),
                row(L("Time", "限时"), L(`${st.actionSec} s per decision, then your time bank (${st.timeBankSec} s, +5 s every 10 hands). On time out you check or fold.`, `每次决定 ${st.actionSec} 秒，之后自动用时间银行（${st.timeBankSec} 秒，每 10 手 +5 秒）；超时自动过牌或弃牌。`))
            ]],
            [L("Showdown", "摊牌"), [
                row(L("Order", "亮牌"), L("The last aggressor on the river shows first; others show only a hand that can still win, otherwise it is mucked.", "河牌最后加注的人先亮牌；之后的人能赢才亮，否则自动盖牌。")),
                row(L("All-in", "全下"), L("When nobody can bet any more, every hand is turned up and the board is run out.", "无人还能下注时，所有人亮牌，公共牌一张张发完。")),
                row(L("Side pots", "边池"), L("An all-in player can win only what they matched from each opponent; the rest forms side pots.", "全下的人只能赢自己跟得上的部分，多出来的组成边池。")),
                row(L("Split", "平分"), L("Equal hands split the pot; suits never break ties. Odd chips go to the first winner left of the button.", "牌力相同平分底池，花色不比大小；零头给庄家左边的第一位赢家。"))
            ]],
            [L("Hands", "牌型"), [rankingHTML()]],
            [L("Chips", "筹码"), [
                row(L("Bankroll", "账户"), L("Everyone starts with 10,000 play chips. Buy in for 40 to 100 big blinds; what you leave with goes back to your bankroll.", "每人起始 10,000 虚拟筹码。买入 40 到 100 个大盲，离桌时剩余筹码回到账户。")),
                row(L("Refill", "领取"), L("Below 2,000 chips with nothing at a table you can get a free refill to 10,000, once a day. The ranking counts net chips, so refills never help it.", "筹码低于 2,000 且不在牌桌上时，每天可以免费领一次，补到 10,000；排行榜按净胜筹码，领取不计入。")),
                row(L("Play money", "虚拟"), L("Chips have no value: they cannot be bought, sold or transferred.", "筹码没有任何价值，不能购买、出售或转让。"))
            ]]
        ];
    }

    function openTabs(title, tabs, first = 0) {
        const close = ui.openPopup({
            title,
            wide: true,
            html: `<div class="gd-rules">
                <div class="gd-rules-tabs" role="tablist" aria-orientation="vertical">${tabs.map(([t], i) => `<button class="gd-rules-tab" type="button" role="tab" aria-selected="${i === first}"${i === first ? "" : ` tabindex="-1"`}>${t}</button>`).join("")}</div>
                <div class="gd-rules-panes">${tabs.map(([, rows], i) => `<section class="gd-rules-pane" role="tabpanel"${i === first ? "" : " hidden"}>${rows.join("")}</section>`).join("")}</div>
            </div>`
        });
        const panel = close.panel;
        panel.querySelector(".gd-popup-body").classList.add("has-tabs");
        const tabEls = [...panel.querySelectorAll(".gd-rules-tab")];
        const panes = [...panel.querySelectorAll(".gd-rules-pane")];
        const show = (i, focus) => {
            tabEls.forEach((tab, j) => {
                tab.setAttribute("aria-selected", String(i === j));
                tab.tabIndex = i === j ? 0 : -1;
                panes[j].hidden = i !== j;
            });
            panes[i].scrollTop = 0;
            if (focus) tabEls[i].focus();
        };
        panel.querySelector(".gd-rules-tabs").addEventListener("click", event => {
            const tab = event.target.closest(".gd-rules-tab");
            if (tab) show(tabEls.indexOf(tab), false);
        });
        panel.querySelector(".gd-rules-tabs").addEventListener("keydown", event => {
            const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
            if (!step) return;
            event.preventDefault();
            show((tabEls.indexOf(document.activeElement) + step + tabEls.length) % tabEls.length, true);
        });
        return close;
    }

    function openRules(tab = 0) {
        return openTabs(L("Hold'em rules", "德州扑克规则"), rulesTabs(), tab);
    }

    // ---------- 上一手 ----------
    function openLastHand() {
        const last = S.table?.last;
        if (!last) return ui.showToast(L("No finished hand yet", "还没有打完的牌"));
        const board = last.board?.length ? last.board : [];
        const seats = S.table.seats;
        const shown = Object.entries(last.shown || {}).map(([i, hole]) => [Number(i), hole]);
        const winners = last.winners || [];
        const lines = new Map();
        winners.forEach(w => lines.set(w.seat, { won: (lines.get(w.seat)?.won || 0) + w.amt, hand: w.hand }));
        shown.forEach(([i]) => { if (!lines.has(i)) lines.set(i, { won: 0, hand: null }); });
        const rows = [...lines.entries()].map(([i, info]) => {
            const seat = seats[i];
            const hole = (last.shown || {})[i];
            // every shown hand is named (the losers' too), not only the winners'
            const hand = info.hand || last.hands?.[i] || null;
            const win = new Set(info.hand?.cards || []);
            return `<div class="hd-last-row${info.won ? " is-win" : ""}">
                <span class="gd-avatar${S.me?.seat === i ? "" : " is-opp"} hd-last-av">${seat ? faceHTML(seat) : ui.defaultFaceHTML()}</span>
                <span class="hd-last-name"><b>${esc(seat ? seatName(seat, L) : L(`Seat ${i + 1}`, `${i + 1} 号位`))}</b><small>${hand ? esc(handLabel(hand, L)) : hole ? "" : L("Did not show", "未亮牌")}</small></span>
                <span class="hd-last-cards">${(hole || []).map((c, k) => ui.cardHTML(toCard(c, `lh${i}${k}`), true, win.size && !win.has(c) ? "is-dim" : "")).join("")}</span>
                <b class="hd-last-amt">${info.won ? `+${fmt(info.won)}` : ""}</b>
            </div>`;
        }).join("");
        const winSet = new Set(winners.flatMap(w => w.hand?.cards || []));
        ui.openPopup({
            title: L(`Last hand · #${last.no}`, `上一手 · 第 ${last.no} 手`),
            html: `<div class="hd-last">
                <div class="hd-last-board">${board.map((c, k) => ui.cardHTML(toCard(c, `lb${k}`), true, winSet.size && !winSet.has(c) ? "is-dim" : "")).join("") || `<span class="hd-last-none">${L("Won before the flop", "翻牌前结束")}</span>`}</div>
                ${rows}
            </div>`
        });
    }

    // ---------- Hold'em ranking (巅峰对决 board language) ----------
    async function openBoard() {
        const page = document.createElement("div");
        page.className = "hd-page gdr-scope";
        page.setAttribute("role", "dialog");
        page.setAttribute("aria-modal", "true");
        page.setAttribute("aria-label", L("Hold'em ranking", "德州排行榜"));
        page.innerHTML = `<div class="hd-page-head">
                <button class="gdr-back hd-page-back" type="button" aria-label="${L("Back", "返回")}"><svg class="gdr-back-ic" viewBox="0 0 36 28" aria-hidden="true"><path d="M14 1 1 14l13 13v-8.2c9.6-.4 15.6 2 20.4 8.2-1.2-10-7.4-16.6-20.4-17.6V1Z"/></svg></button>
                <div class="hd-page-title"><h2>${L("Hold'em Ranking", "德州排行榜")}</h2><span>${L("Net chips won · play money", "按净胜筹码排名 · 虚拟筹码")}</span></div>
            </div>
            <div class="hd-page-body"><div class="hd-board-loading"><i></i>${L("Loading…", "加载中…")}</div></div>`;
        document.body.appendChild(page);
        requestAnimationFrame(() => page.classList.add("is-open"));
        const opener = document.activeElement;
        const closePage = () => {
            document.removeEventListener("keydown", onKey, true);
            page.classList.remove("is-open");
            setTimeout(() => page.remove(), 180);
            opener?.focus?.({ preventScroll: true });
        };
        function onKey(event) {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            closePage();
        }
        document.addEventListener("keydown", onKey, true);
        page.querySelector(".hd-page-back").addEventListener("click", closePage);
        page.querySelector(".hd-page-back").focus({ preventScroll: true });
        const body = page.querySelector(".hd-page-body");
        let data;
        try {
            if (!ui.account) throw new Error("offline");
            await ui.account.ready();
            data = await ui.account.request("/leaderboard?game=holdem&limit=50");
        } catch (_) {
            body.innerHTML = `<div class="hd-board-empty">${L("The ranking is unavailable right now", "排行榜暂时不可用")}</div>`;
            return;
        }
        body.innerHTML = boardHTML(data);
        body.querySelector("[data-board-play]")?.addEventListener("click", () => {
            closePage();
            document.querySelector('[data-lobby="h-practice"]')?.click();
        });
    }

    function rankBadge(i) {
        if (i > 2) return `<span class="gdr-rank n">${i + 1}</span>`;
        return `<span class="gdr-rank m${i + 1}" aria-label="${i + 1}"><svg viewBox="0 0 48 40" aria-hidden="true"><path class="gdr-rank-w" d="M11 9.5 1 7.5l3.2 5.2L.5 14l4.4 4.3-3 1.7 5.4 4 3.7-.6ZM37 9.5l10-2-3.2 5.2L47.5 14l-4.4 4.3 3 1.7-5.4 4-3.7-.6Z"/><path class="gdr-rank-b" d="M24 1.5 39 9v13.5c0 8.3-6.4 13.6-15 16-8.6-2.4-15-7.7-15-16V9z"/><path class="gdr-rank-h" d="M24 4.8 36 10.8v5.9c-7.6 2.4-16.4 2.4-24 0v-5.9z"/></svg><b>${i + 1}</b></span>`;
    }

    function boardHTML(data) {
        const rows = data.rows || [];
        const mePid = data.me?.pid || ui.account?.account?.pid;
        const PL = ui.labPlayers();
        const face = name => {
            const photo = PL[ui.labPlayerKey(name)]?.avatar;
            return photo ? `<img src="${esc(photo)}" alt="" loading="lazy">` : ui.defaultFaceHTML();
        };
        const line = (r, i, me) => {
            const rate = r.hands ? `${Math.round(r.won * 100 / r.hands)}%` : "-";
            return `<div class="hd-brow${i < 3 ? " is-top" : ""}${me ? " is-me" : ""}" style="--i:${Math.min(i, 10)}">
                <span class="hd-bc-rank">${i == null ? `<span class="gdr-rank n">${r.rank ? r.rank : "-"}</span>` : rankBadge(i)}</span>
                <span class="hd-bc-name"><span class="gd-avatar is-plain">${face(r.name)}</span><b>${esc(r.name)}</b>${me ? `<em>${L("Me", "我")}</em>` : ""}</span>
                <b class="hd-bc-num${r.net < 0 ? " is-neg" : r.net === 0 ? " is-zero" : ""}">${r.net > 0 ? "+" : ""}${fmt(r.net)}</b>
                <b class="hd-bc-num">${fmt(r.hands)}</b>
                <b class="hd-bc-num">${rate}</b>
                <b class="hd-bc-num">${fmt(r.biggestPot)}</b>
            </div>`;
        };
        const inTop = rows.some(r => r.pid === mePid);
        const rule = data.rule || { days: 3, hands: 50 };
        const ruleText = L(`Accounts rank after ${rule.days} days and ${rule.hands} hands`, `注册满 ${rule.days} 天、打满 ${rule.hands} 手即可上榜`);
        const head = `<div class="hd-bhead"><span>${L("Rank", "名次")}</span><span>${L("Player", "玩家")}</span><span>${L("Net", "净胜筹码")}</span><span>${L("Hands", "手数")}</span><span>${L("Won", "胜率")}</span><span>${L("Biggest pot", "最大底池")}</span></div>`;
        // nobody ranked yet: the three empty places on their steps, and (from the lobby) a way to play a first hand
        if (!rows.length) {
            const step = i => `<div class="hd-pod is-p${i + 1}">${rankBadge(i)}<span class="gd-avatar is-plain hd-pod-av">${ui.defaultFaceHTML()}</span><span class="hd-pod-step">${i + 1}</span></div>`;
            const play = !S.screen && document.querySelector('[data-lobby="h-practice"]')
                ? `<button class="btn primary hd-board-play" type="button" data-board-play>${L("Play a hand", "去打一手")}</button>` : "";
            return `<div class="hd-lb is-empty">${head}
                <div class="hd-podium"><div class="hd-pods">${[1, 0, 2].map(step).join("")}</div>
                <p class="hd-board-empty">${L("Nobody ranked yet.", "还没有人上榜。")} ${ruleText}${data.me?.hands ? L(` · you: ${fmt(data.me.hands)} hands so far`, ` · 你已打 ${fmt(data.me.hands)} 手`) : ""}</p>${play}</div>
            </div>`;
        }
        // my own row below the list only once I have played (an unranked 0 / 0 / - row says nothing); unranked, it says
        // when it will rank
        return `<div class="hd-lb">${head}
            <div class="hd-brows">${rows.map((r, i) => line(r, i, r.pid === mePid)).join("")}</div>
            ${!inTop && data.me?.hands ? `<div class="hd-bme">${line(data.me, null, true)}${data.me.rank ? "" : `<p class="hd-bme-note">${ruleText}</p>`}</div>` : ""}
        </div>`;
    }

    return {
        get active() { return !!S.screen; },
        start,
        render: () => render(),
        titleHTML,
        invite: inviteLink,
        leave,
        release,
        openRules,
        openBoard
    };
}
