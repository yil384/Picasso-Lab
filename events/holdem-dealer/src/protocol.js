// Validation of every client -> server WebSocket message (DESIGN.md section 6). Returns a clean copy holding only
// the documented fields, or null (the transport answers { t:"error", code:"bad_message", re }).
//
//   parseMessage(text) -> { msg } | { error: "bad_json" | "bad_message", re }

const ACTIONS = new Set(['fold', 'check', 'call', 'raise', 'allin']);
const HOST_OPS = new Set(['settings', 'start', 'fillBots', 'removeBot', 'dissolve']);
const CODE_RE = /^[A-Z2-9]{5}$/;

const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function settings(s) {
  if (s === undefined) return {};
  if (!isObj(s)) return null;
  const out = {};
  if (s.blinds !== undefined) { if (typeof s.blinds !== 'string' || s.blinds.length > 10) return null; out.blinds = s.blinds; }
  for (const k of ['seats', 'actionSec', 'timeBankSec']) {
    if (s[k] === undefined) continue;
    if (!isInt(s[k], 0, 120)) return null;
    out[k] = s[k];
  }
  return out;
}

function clean(m) {
  switch (m.t) {
    case 'hello':
      if (m.v !== 1 || typeof m.token !== 'string' || m.token.length > 100) return null;
      return { t: 'hello', v: 1, token: m.token };
    case 'ping': case 'unwatch': case 'stand': case 'postBB': case 'show':
      return { t: m.t };
    case 'create': {
      const s = settings(m.settings);
      if (!s || (m.practice !== undefined && typeof m.practice !== 'boolean')) return null;
      return { t: 'create', settings: s, practice: m.practice === true };
    }
    case 'watch': {
      if (typeof m.code !== 'string') return null;
      const code = m.code.trim().toUpperCase();
      return CODE_RE.test(code) ? { t: 'watch', code } : null;
    }
    case 'sit':
      if (!isInt(m.seat, 0, 8) || !isInt(m.buyIn, 1, 1e9)) return null;
      return { t: 'sit', seat: m.seat, buyIn: m.buyIn };
    case 'sitOut':
      if (typeof m.on !== 'boolean') return null;
      return { t: 'sitOut', on: m.on };
    case 'act':
      if (typeof m.hand !== 'string' || m.hand.length > 40 || !ACTIONS.has(m.action)) return null;
      if (m.to !== undefined && m.to !== null && !isInt(m.to, 1, 1e9)) return null;
      if (m.action === 'raise' && !Number.isInteger(m.to)) return null;
      return { t: 'act', hand: m.hand, action: m.action, to: Number.isInteger(m.to) ? m.to : null };
    case 'topUp':
      if (!isInt(m.amount, 1, 1e9)) return null;
      return { t: 'topUp', amount: m.amount };
    case 'host': {
      if (!HOST_OPS.has(m.op)) return null;
      const out = { t: 'host', op: m.op };
      if (m.op === 'settings') {
        const s = settings(m.settings);
        if (!s) return null;
        out.settings = s;
      } else if (m.op === 'removeBot') {
        if (!isInt(m.seat, 0, 8)) return null;
        out.seat = m.seat;
      } else if (m.op === 'fillBots' && m.count !== undefined) {
        if (!isInt(m.count, 1, 8)) return null;
        out.count = m.count;
      }
      return out;
    }
    default:
      return null;
  }
}

export function parseMessage(text) {
  let m;
  try {
    m = JSON.parse(text);
  } catch (_) {
    return { error: 'bad_json', re: null };
  }
  if (!isObj(m) || typeof m.t !== 'string' || m.t.length > 16) return { error: 'bad_message', re: null };
  const msg = clean(m);
  return msg ? { msg } : { error: 'bad_message', re: m.t };
}
