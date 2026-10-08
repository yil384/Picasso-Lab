// Test hooks for the browser harness (guandan-kit/harness/holdem/), loaded only when HOLDEM_TEST_HOOKS=1 (config.js
// refuses that flag in production) and answering loopback callers only. They exist so a browser suite can check the
// real service end to end: what every hand really dealt (to prove no page ever received a card it may not see) and
// a rigged deck for the next hand of a table (side pots, splits, quads on demand). Nothing here is reachable, or
// even loaded, in a normal run.
//
//   createTestHooks({ rooms, log }) -> { onChange(table), handle(req, res) -> bool (true when it answered) }
//   GET  /__test/hands?code=CODE   -> { hands: { [handId]: { code, no, holes: { seat: [c1, c2] }, pids: { seat: pid },
//                                     folded: [seat], mucked: [seat], showed: [seat] } } }   (newest 2,000 hands)
//   POST /__test/deck { code, holes?: { seat: [c1, c2] }, board?: [c1..c5] }   rig the next hand dealt at the table
//                                     (cards are swapped into place right after the deal, before anyone sees it)

import { HoldemTable } from './engine/table.js';
import { isCard } from './engine/cards.js';

const KEEP = 2000;
const BOARD_AT = [1, 2, 3, 5, 7]; // deck positions of flop, turn and river (burns at 0, 4, 6)

function loopback(req) {
  const a = req.socket?.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(text), 'cache-control': 'no-store' });
  res.end(text);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Swap the wanted cards into place: holes of the given seats, then the board positions of the deck.
export function applyRig(state, rig) {
  const h = state.hand;
  const where = (c) => {
    for (let i = 0; i < state.seats.length; i++) {
      const s = state.seats[i];
      const k = s?.hole ? s.hole.indexOf(c) : -1;
      if (k >= 0) return { arr: s.hole, k, seat: i };
    }
    const k = h.deck.indexOf(c);
    if (k >= 0) return { arr: h.deck, k, seat: null };
    return null; // burned already (cannot happen right after the deal)
  };
  const fixed = new Set();
  for (const [seat, cards] of Object.entries(rig.holes || {})) {
    const s = state.seats[Number(seat)];
    if (!s?.hole) continue;
    cards.forEach((c, j) => {
      const from = where(c);
      if (!from) return;
      [from.arr[from.k], s.hole[j]] = [s.hole[j], from.arr[from.k]];
      fixed.add(c);
    });
  }
  (rig.board || []).slice(0, 5).forEach((c, b) => {
    const from = where(c);
    if (!from || (from.seat !== null && fixed.has(c))) return;
    const at = BOARD_AT[b];
    [from.arr[from.k], h.deck[at]] = [h.deck[at], from.arr[from.k]];
  });
}

export function createTestHooks({ rooms, log = () => {} }) {
  const hands = new Map();

  function onChange(table) {
    const h = table.hand;
    if (!h) return;
    let rec = hands.get(h.id);
    if (!rec) {
      rec = { code: table.code, no: h.no, holes: {}, pids: {}, folded: [], mucked: [], showed: [] };
      hands.set(h.id, rec);
      while (hands.size > KEEP) hands.delete(hands.keys().next().value);
    }
    table.seats.forEach((s, i) => {
      if (!s || !s.inHand) return;
      if (s.hole?.length === 2 && !rec.holes[i]) { rec.holes[i] = s.hole.slice(); rec.pids[i] = s.pid; }
      if (s.folded && !rec.folded.includes(i)) rec.folded.push(i);
      if (s.mucked && !rec.mucked.includes(i)) rec.mucked.push(i);
      if (s.last?.a === 'show' && !rec.showed.includes(i)) rec.showed.push(i);
    });
  }

  function rigNext(table, rig) {
    const deal = HoldemTable.prototype._dealHand;
    table._dealHand = function rigged(now) {
      const ok = deal.call(this, now);
      if (ok) {
        delete this._dealHand;
        applyRig(this.s, rig);
        log('test hook: rigged hand', { code: this.code, no: this.s.hand.no });
      }
      return ok;
    };
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith('/__test/')) return false;
    if (!loopback(req)) { req.resume(); json(res, 403, { error: 'loopback_only' }); return true; }
    try {
      if (req.method === 'GET' && url.pathname === '/__test/hands') {
        const code = url.searchParams.get('code');
        const out = {};
        for (const [id, rec] of hands) if (!code || rec.code === code) out[id] = rec;
        json(res, 200, { hands: out });
        return true;
      }
      if (req.method === 'POST' && url.pathname === '/__test/deck') {
        const body = await readJson(req);
        const table = rooms.get(String(body.code || ''));
        if (!table) { json(res, 404, { error: 'no_table' }); return true; }
        const cards = [...Object.values(body.holes || {}).flat(), ...(body.board || [])];
        if (!cards.every(isCard) || new Set(cards).size !== cards.length) { json(res, 400, { error: 'bad_cards' }); return true; }
        rigNext(table, { holes: body.holes || {}, board: body.board || [] });
        json(res, 200, { ok: true });
        return true;
      }
      req.resume();
      json(res, 404, { error: 'not_found' });
    } catch (e) {
      json(res, 400, { error: 'bad_request', message: e.message });
    }
    return true;
  }

  return { onChange, handle };
}
