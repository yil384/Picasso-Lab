// Picasso Lab games: the account layer shared by Guandan and Hold'em (events/holdem-dealer/DESIGN.md §4).
// Guest first: the page keeps its local Guandan id and nickname; in the background it opens a session with the
// games service (never blocking the lobby; 4 s timeout; offline the page works exactly as before), keeps the
// device token in localStorage, offers "continue as X?" to a fresh browser (one click, never automatic), keeps
// the nickname in sync, shows the 账号 popup (bankroll, records, save with email) and reports Guandan rounds.
// Play money only: chips cannot be bought, sold or transferred.
const TOKEN_KEY = "picasso.games.token";
const CACHE_KEY = "picasso.games.account";
const SEEN_KEY = "picasso.games.gdRounds";
const LINK_EMAIL_KEY = "picasso.games.linkEmail";
const LINK_URL = "https://yil384.github.io/Picasso-Lab/events/account-link.html";
const FIREBASE_AUTH = "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
const SESSION_TIMEOUT_MS = 4000;
const POLL_MS = 2500;
const POLL_FOR_MS = 30 * 60 * 1000;
const REFILL_BELOW = 2000;

// ctx: { origin, fresh, clientId, getName(), setName(name), avatarHTML(name), lang(), L(en, zh), encodeHTML,
//        openPopup, showToast, storageGet, storageSet, firebaseApp }
export function createAccount(ctx) {
    const { L, encodeHTML: esc, storageGet, storageSet } = ctx;
    const api = `${ctx.origin.replace(/\/+$/, "")}/v1`;
    const listeners = new Set();
    let account = readCache();
    let features = { emailLink: false };
    let status = "pending";            // pending | online | offline
    let suggestions = [];
    let pendingLink = null;            // { lid, poll, email, until } while an email link waits to be opened
    let pollTimer = 0;
    const attempted = new Set();       // Guandan rounds tried this page load

    function readCache() {
        try { return JSON.parse(storageGet(CACHE_KEY) || "null"); } catch (_) { return null; }
    }
    function setAccount(next) {
        if (!next) return;
        account = next;
        storageSet(CACHE_KEY, JSON.stringify(next));
        listeners.forEach(fn => fn(account));
    }
    function setToken(token) {
        if (token) storageSet(TOKEN_KEY, token);
    }

    // A token the service no longer knows (401 auth: its data was reset) gets a fresh session and one retry.
    async function request(path, body, opts = {}) {
        try {
            return await send(path, body, opts);
        } catch (err) {
            if (err.code !== "auth" || path === "/session" || opts.retried) throw err;
            await openSession();
            return send(path, body, { ...opts, retried: true });
        }
    }

    async function send(path, body, { timeout = 8000, auth = true } = {}) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        try {
            const headers = {};
            if (body !== undefined) headers["content-type"] = "application/json";
            const token = storageGet(TOKEN_KEY);
            if (auth && token) headers.authorization = `Bearer ${token}`;
            const res = await fetch(api + path, {
                method: body === undefined ? "GET" : "POST",
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: ctrl.signal,
                credentials: "omit",
                cache: "no-store"
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw Object.assign(new Error(data.error || `http_${res.status}`), { status: res.status, code: data.error || "" });
            return data;
        } finally {
            clearTimeout(timer);
        }
    }

    // POST /v1/session in the background. A stale or unknown token gets a fresh guest account (and token).
    let sessionRun = null;
    function openSession() {
        sessionRun = (async () => {
            status = "pending";
            try {
                const out = await request("/session", { clientId: ctx.clientId, name: ctx.getName() || undefined, fresh: !!ctx.fresh }, { timeout: SESSION_TIMEOUT_MS });
                setToken(out.token);
                features = { ...features, ...(out.features || {}) };
                status = "online";
                setAccount(out.account);
                suggestions = ctx.fresh ? (out.suggestions || []).slice(0, 3) : [];
                if (suggestions.length) whenLobby(promptSuggestions);
                else syncName(ctx.getName(), out.account?.name);
            } catch (_) {
                status = "offline";
                listeners.forEach(fn => fn(account));
            }
            return status === "online";
        })();
        return sessionRun;
    }

    // The service only learns the lobby nickname; a name kept by an email-saved account is refused
    // (409 name_protected): the field goes back to `previous` with a toast. Offline nothing happens.
    async function syncName(name, previous) {
        name = String(name || "").trim();
        if (!name || status !== "online" || name === account?.name) return;
        try {
            setAccount((await request("/name", { name })).account);
        } catch (err) {
            if (err.code !== "name_protected" && err.code !== "bad_name") return;
            const back = previous && previous !== name ? previous : account?.name || "";
            ctx.setName(back);
            ctx.showToast(err.code === "name_protected"
                ? L("That name belongs to a saved account. Pick another one", "这个昵称已被绑定邮箱的玩家使用，换一个吧")
                : L("That name cannot be used", "这个昵称不能使用"), 2600);
        }
    }

    // A fresh browser may be offered the names used from the same network: one click on 继续 claims it.
    function whenLobby(fn) {
        if (document.body.dataset.screen === "lobby") return fn();
        const watch = new MutationObserver(() => {
            if (document.body.dataset.screen !== "lobby") return;
            watch.disconnect();
            fn();
        });
        watch.observe(document.body, { attributes: true, attributeFilter: ["data-screen"] });
    }

    function promptSuggestions() {
        if (!suggestions.length) return;
        const one = suggestions.length === 1;
        const names = suggestions.map(s => `<button class="btn primary ga-claim" type="button" data-sid="${esc(s.sid)}">${one ? L("Continue", "继续") : esc(s.name)}</button>`).join("");
        const close = ctx.openPopup({
            title: L("Welcome back", "欢迎回来"),
            narrow: true,
            html: `<div class="ga-suggest">
                ${one ? `<span class="ga-suggest-face">${ctx.avatarHTML(suggestions[0].name)}</span>` : ""}
                <p class="gd-confirm-text">${one ? L(`Continue as ${esc(suggestions[0].name)}?`, `继续以 ${esc(suggestions[0].name)} 的身份？`) : L("Continue as one of these players?", "继续以哪个身份？")}</p>
                <div class="gd-confirm-row${one ? "" : " is-names"}"><button class="btn secondary" type="button" data-new>${L("I'm new", "我是新玩家")}</button>${names}</div>
                <button class="ga-link" type="button" data-privacy>${L("Privacy", "隐私说明")}</button>
            </div>`,
            onClose: () => { suggestions = []; }
        });
        close.panel.addEventListener("click", async event => {
            const btn = event.target.closest("button");
            if (!btn) return;
            if (btn.hasAttribute("data-privacy")) return openPrivacy();
            if (btn.hasAttribute("data-new")) return close();
            if (!btn.dataset.sid || btn.disabled) return;
            btn.disabled = true;
            try {
                const out = await request("/claim", { sid: btn.dataset.sid });
                setToken(out.token);
                setAccount(out.account);
                ctx.setName(out.account.name);
                close();
                ctx.showToast(L(`Welcome back, ${out.account.name}`, `欢迎回来，${out.account.name}`), 2200);
            } catch (err) {
                btn.disabled = false;
                close();
                ctx.showToast(err.code === "ip_mismatch" || err.code === "expired" || err.code === "protected"
                    ? L("That suggestion has expired", "这个建议已失效")
                    : L("The game service is unavailable", "游戏服务暂不可用"), 2400);
            }
        });
    }

    function openPrivacy() {
        ctx.openPopup({
            title: L("Privacy", "隐私说明"),
            narrow: true,
            html: `<p class="ga-privacy">${L(
                "So you can pick your name up again in a new browser, the game service keeps a salted hash of your network address (never the raw IP) together with the guest names used from that network in the last 30 days, and deletes it after 30 days. A new browser only sees a “Continue as X?” suggestion and nothing happens until you click it. People on the same campus network or router may see the same suggestion, so an email-saved account is never suggested or signed in by network address. Your email is used only to send the sign-in link; we keep a masked form and a hash. All chips are play money: they cannot be bought, sold or transferred and have no value.",
                "为了让你换浏览器时能一键找回昵称，游戏服务会把你的网络地址做加盐哈希（不保存、不记录原始 IP），并记住最近 30 天里在这个网络用过的游客昵称，30 天后自动删除。新浏览器只会看到“继续以 X 的身份？”的建议，必须由你点一下才会生效；同一校园网或路由器下的人也可能看到同样的建议，所以绑定了邮箱的账号永远不会靠网络地址被推荐或登录。邮箱只用于发送登录链接，我们只保存脱敏地址和一个哈希。所有筹码都是虚拟的，不能购买、出售或转让，没有任何价值。")}</p>`
        });
    }

    // ---------- 账号 popup ----------
    const fmt = n => Math.round(Number(n) || 0).toLocaleString("en-US");
    function statHTML(label, value, cls = "") {
        return `<div class="ga-stat${cls ? ` ${cls}` : ""}"><b>${value}</b><span>${label}</span></div>`;
    }
    function profileHTML() {
        const a = account;
        const name = ctx.getName() || a?.name || L("Guest", "游客");
        const saved = a && !a.guest;
        const h = a?.holdem || {};
        const g = a?.guandan || {};
        const rate = h.hands ? `${Math.round(h.won * 100 / h.hands)}%` : "-";
        const refill = a && a.chips < REFILL_BELOW;
        const offline = status !== "online";
        return `<div class="ga-profile">
            <div class="ga-id">
                <span class="hud-avatar ga-face">${ctx.avatarHTML(name)}</span>
                <div class="ga-id-text">
                    <b class="ga-name">${esc(name)}</b>
                    <span class="ga-status${saved ? " is-saved" : ""}">${saved ? `${L("Saved", "已保存")} · ${esc(a.email || "")}` : L("Guest", "游客")}</span>
                </div>
                <div class="ga-bank">
                    <span class="ga-bank-k">${L("Chips", "筹码")}</span>
                    <b class="ga-bank-v"><i class="ga-coin" aria-hidden="true"></i>${a ? fmt(a.chips) : "-"}</b>
                    ${refill && !offline ? `<button class="btn ok sm" type="button" data-ga="refill">${L("Get chips", "领取筹码")}</button>` : ""}
                </div>
            </div>
            ${offline ? `<div class="ga-offline"><span>${status === "pending" ? L("Connecting to the game service…", "正在连接游戏服务…") : L("The game service is unavailable", "游戏服务暂不可用")}</span>${status === "pending" ? "" : `<button class="btn secondary sm" type="button" data-ga="retry">${L("Retry", "重试")}</button>`}</div>` : ""}
            <div class="ga-games">
                <section class="ga-game"><h3>${L("Hold'em", "德州扑克")}</h3><div class="ga-stats">
                    ${statHTML(L("Hands", "手数"), fmt(h.hands))}${statHTML(L("Won", "胜率"), rate)}${statHTML(L("Biggest pot", "最大底池"), fmt(h.biggestPot))}${statHTML(L("Net", "净胜"), `${h.net > 0 ? "+" : ""}${fmt(h.net)}`, h.net < 0 ? "is-neg" : "")}
                </div></section>
                <section class="ga-game"><h3>${L("Guandan", "掼蛋")}</h3><div class="ga-stats">
                    ${statHTML(L("Rounds", "局数"), fmt(g.rounds))}${statHTML(L("Wins", "胜局"), fmt(g.wins))}
                </div></section>
            </div>
            <div class="ga-foot">
                ${features.emailLink && !saved && !offline ? `<button class="btn primary" type="button" data-ga="email">${pendingLink ? L("Waiting for the link…", "等待邮件确认…") : L("Save with email", "用邮箱保存")}</button>` : ""}
                <p class="ga-note">${L("All chips are play money.", "所有筹码都是虚拟的，不能购买或转让。")} <button class="ga-link" type="button" data-ga="privacy">${L("Privacy", "隐私说明")}</button></p>
            </div>
        </div>`;
    }

    function openProfile() {
        let paint = null;
        const close = ctx.openPopup({ title: L("Account", "账号"), html: profileHTML(), onClose: () => listeners.delete(paint) });
        const body = close.panel.querySelector(".gd-popup-body");
        paint = () => { body.innerHTML = profileHTML(); };
        listeners.add(paint);
        if (status === "online") request("/me").then(out => setAccount(out.account)).catch(() => {});
        body.addEventListener("click", async event => {
            const btn = event.target.closest("[data-ga]");
            if (!btn || btn.disabled) return;
            const act = btn.dataset.ga;
            if (act === "privacy") return openPrivacy();
            if (act === "email") return openEmail();
            if (act === "retry") {
                btn.disabled = true;
                status = "pending";
                paint();
                await openSession();
                return paint();
            }
            if (act === "refill") {
                btn.disabled = true;
                try {
                    setAccount((await request("/refill", {})).account);
                    ctx.showToast(L("Chips topped up to 10,000", "筹码已补到 10,000"));
                } catch (err) {
                    btn.disabled = false;
                    ctx.showToast(err.code === "not_needed"
                        ? L("Available below 2,000 chips with nothing at a table", "筹码低于 2,000 且不在牌桌上时才能领取")
                        : L("The game service is unavailable", "游戏服务暂不可用"), 2400);
                }
            }
        });
        return close;
    }

    // ---------- save with email (Firebase email link, completed on account-link.html) ----------
    const masked = email => {
        const [user, domain] = String(email).split("@");
        return `${(user || "").slice(0, 1)}***@${domain || ""}`;
    };
    function emailHTML(state, note = "") {
        if (state === "sent") {
            return `<div class="ga-email is-sent">
                <span class="ga-email-ring" aria-hidden="true"></span>
                <p class="gd-confirm-text">${L(`A sign-in link was sent to ${esc(masked(pendingLink.email))}. Open it from the email.`, `登录链接已发送到 ${esc(masked(pendingLink.email))}，请在邮件里点开`)}</p>
                <p class="ga-email-wait">${L("Waiting for you to open the link…", "等待你点开邮件里的链接…")}</p>
                <div class="gd-confirm-row"><button class="btn secondary" type="button" data-ga="cancel">${L("Cancel", "取消")}</button><button class="btn primary" type="button" data-ga="resend">${L("Resend", "重新发送")}</button></div>
            </div>`;
        }
        if (state === "done") {
            return `<div class="ga-email is-done"><p class="gd-confirm-text">${L(`Saved. This account is now ${esc(account?.email || "")}`, `已保存，账号绑定 ${esc(account?.email || "")}`)}</p>
                <div class="gd-confirm-row"><button class="btn primary" type="button" data-ga="ok">${L("OK", "好的")}</button></div></div>`;
        }
        return `<form class="ga-email" novalidate>
            <p class="ga-email-lead">${L("Keep your name, chips and records on any device. We send you a one-time sign-in link.", "保存后换设备也能找回昵称、筹码和战绩。我们会发一封一次性的登录邮件。")}</p>
            <input class="ga-email-input" type="email" name="email" inputmode="email" autocomplete="email" spellcheck="false" placeholder="${L("Email address", "邮箱地址")}" value="${esc(storageGet(LINK_EMAIL_KEY) || "")}" aria-label="${L("Email address", "邮箱地址")}">
            <p class="ga-email-err" role="alert">${esc(note)}</p>
            <div class="gd-confirm-row"><button class="btn primary" type="submit">${L("Send sign-in link", "发送登录链接")}</button></div>
            <button class="ga-link" type="button" data-ga="privacy">${L("Privacy", "隐私说明")}</button>
        </form>`;
    }

    let emailClose = null;
    function openEmail() {
        emailClose?.();
        const close = emailClose = ctx.openPopup({
            title: L("Save with email", "用邮箱保存"),
            narrow: true,
            html: emailHTML(pendingLink ? "sent" : "form"),
            onClose: () => { stopPolling(); if (emailClose === close) emailClose = null; }
        });
        const body = close.panel.querySelector(".gd-popup-body");
        const show = (state, note) => {
            body.innerHTML = emailHTML(state, note);
            body.querySelector(".ga-email-input")?.focus({ preventScroll: true });
        };
        if (pendingLink) startPolling(() => show("done"));
        else setTimeout(() => body.querySelector(".ga-email-input")?.focus({ preventScroll: true }), 60);
        const send = async email => {
            const btn = body.querySelector("[type=submit], [data-ga=resend]");
            if (btn) btn.disabled = true;
            try {
                const { lid, poll } = await request("/email/start", { email });
                const { getAuth, sendSignInLinkToEmail } = await import(FIREBASE_AUTH);
                const url = `${LINK_URL}?lid=${encodeURIComponent(lid)}&lang=${ctx.lang() === "en" ? "en" : "zh"}`;
                await sendSignInLinkToEmail(getAuth(ctx.firebaseApp), email, { url, handleCodeInApp: true });
                storageSet(LINK_EMAIL_KEY, email);
                pendingLink = { lid, poll, email, until: Date.now() + POLL_FOR_MS };
                show("sent");
                startPolling(() => show("done"));
            } catch (err) {
                if (btn) btn.disabled = false;
                show("form", {
                    disabled: L("Saving with email is not open yet", "邮箱保存暂未开放"),
                    rate_limited: L("Too many links. Try again later", "发送太频繁，请稍后再试"),
                    bad_email: L("Check the email address", "邮箱格式不对"),
                    already_linked: L("This account is already saved with an email", "这个账号已经用邮箱保存过了")
                }[err.code] || L("Could not send the link. Try again later", "发送失败，请稍后再试"));
            }
        };
        body.addEventListener("submit", event => {
            event.preventDefault();
            const email = body.querySelector(".ga-email-input").value.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show("form", L("Check the email address", "邮箱格式不对"));
            send(email);
        });
        body.addEventListener("click", event => {
            const act = event.target.closest("[data-ga]")?.dataset.ga;
            if (act === "privacy") openPrivacy();
            else if (act === "resend" && pendingLink) send(pendingLink.email);
            else if (act === "cancel") { pendingLink = null; close(); }
            else if (act === "ok") close();
        });
    }

    function stopPolling() {
        clearTimeout(pollTimer);
        pollTimer = 0;
    }
    function startPolling(onDone) {
        stopPolling();
        const tick = async () => {
            if (!pendingLink) return;
            if (Date.now() > pendingLink.until) { pendingLink = null; return; }
            try {
                const out = await request("/email/poll", { lid: pendingLink.lid, poll: pendingLink.poll }, { auth: false });
                if (out.status === "done") {
                    pendingLink = null;
                    setToken(out.token);
                    setAccount(out.account);
                    ctx.setName(out.account.name);
                    ctx.showToast(L("Saved with email", "已用邮箱保存"));
                    return onDone();
                }
            } catch (err) {
                if (err.code === "expired") { pendingLink = null; return; }
            }
            pollTimer = setTimeout(tick, POLL_MS);
        };
        pollTimer = setTimeout(tick, POLL_MS);
    }

    // ---------- Guandan rounds (self-reported, once per room:round on both sides) ----------
    function seenRounds() {
        try { return JSON.parse(storageGet(SEEN_KEY) || "[]"); } catch (_) { return []; }
    }
    async function reportGuandanRound({ room, round, won, place }) {
        const key = `${room}:${round}`;
        if (attempted.has(key) || seenRounds().includes(key)) return;
        attempted.add(key);
        if (!(await sessionRun) || !storageGet(TOKEN_KEY)) return;
        try {
            await request("/guandan/round", { room, round, won: !!won, place });
            storageSet(SEEN_KEY, JSON.stringify([...seenRounds(), key].slice(-200)));
        } catch (_) {}
    }

    openSession();
    return {
        get account() { return account; },
        get status() { return status; },
        get features() { return features; },
        token: () => storageGet(TOKEN_KEY) || "",
        ready: () => sessionRun,
        retry: openSession,
        request,
        setAccount,
        syncName,
        openProfile,
        reportGuandanRound,
        onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    };
}
