// The Hold'em table socket (DESIGN.md §6, §9): hello with the account token, then one watched table. It reconnects
// forever while a Hold'em screen is open (0.5 s -> 8 s with jitter), says hello and watches the table again; the
// next full snapshot repairs whatever was missed. Status: "connecting" | "online" | "reconnecting" | "closed".
const PING_MS = 20000;
const BACKOFF = [500, 1000, 2000, 4000, 8000];

export function createSocket({ origin, token, onMessage, onStatus }) {
    const url = `${origin.replace(/^http/, "ws").replace(/\/+$/, "")}/v1/ws`;
    let ws = null;
    let status = "closed";
    let welcomed = false;
    let watching = "";
    let attempt = 0;
    let retryTimer = 0;
    let pingTimer = 0;
    let waiters = [];

    function setStatus(next) {
        if (next === status) return;
        status = next;
        onStatus(next);
    }

    function open() {
        clearTimeout(retryTimer);
        if (ws) return;
        setStatus(attempt ? "reconnecting" : "connecting");
        welcomed = false;
        let sock;
        try {
            sock = new WebSocket(url);
        } catch (_) {
            return retry();
        }
        ws = sock;
        sock.onopen = () => sock.send(JSON.stringify({ t: "hello", v: 1, token: token() }));
        sock.onmessage = event => {
            let msg;
            try { msg = JSON.parse(event.data); } catch (_) { return; }
            if (msg.t === "welcome") {
                welcomed = true;
                attempt = 0;
                if (watching) sock.send(JSON.stringify({ t: "watch", code: watching }));
                clearInterval(pingTimer);
                pingTimer = setInterval(() => send({ t: "ping" }), PING_MS);
                setStatus("online");
                waiters.splice(0).forEach(w => w.resolve(msg));
            }
            onMessage(msg);
        };
        sock.onclose = () => {
            if (ws !== sock) return;
            ws = null;
            welcomed = false;
            clearInterval(pingTimer);
            if (status === "closed") return;
            retry();
        };
        sock.onerror = () => {};
    }

    function retry() {
        ws = null;
        const base = BACKOFF[Math.min(attempt, BACKOFF.length - 1)];
        attempt++;
        setStatus("reconnecting");
        // the first failures also fail whoever is waiting to start a table
        if (attempt >= 3) waiters.splice(0).forEach(w => w.reject(new Error("unreachable")));
        retryTimer = setTimeout(open, base * (0.75 + Math.random() * 0.5));
    }

    // Resolves once a hello was answered (now or after a reconnect); rejects after a few failed tries.
    function ready(timeout = 8000) {
        if (status === "online" && welcomed) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const w = { resolve, reject };
            waiters.push(w);
            setTimeout(() => {
                if (!waiters.includes(w)) return;
                waiters = waiters.filter(x => x !== w);
                reject(new Error("timeout"));
            }, timeout);
            if (status === "closed") open();
        });
    }

    function send(msg) {
        if (!ws || !welcomed || ws.readyState !== 1) return false;
        ws.send(JSON.stringify(msg));
        return true;
    }

    return {
        get status() { return status; },
        ready,
        send,
        watch(code) {
            watching = code;
            send({ t: "watch", code });
        },
        unwatch() {
            watching = "";
            send({ t: "unwatch" });
        },
        // a new hello on a fresh socket (the account token changed)
        reconnect() {
            ws?.close();
        },
        close() {
            setStatus("closed");
            clearTimeout(retryTimer);
            clearInterval(pingTimer);
            attempt = 0;
            watching = "";
            const sock = ws;
            ws = null;
            sock?.close();
        }
    };
}
