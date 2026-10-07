// Pots: uncalled bets, side pots from contributions, awarding with the odd-chip rule. Pure functions on arrays
// indexed by seat (0 for seats that put nothing in).
//
// Exports
//   uncalledBet(amounts) -> { seat, amount } | null
//        The largest amount, when it is the only largest, exceeds the second largest by `amount`; that part was
//        never called and goes back to `seat`. Works on street bets or on whole-hand contributions.
//   buildPots(contrib, folded) -> [{ amt, seats: [eligible seat, ...] }]   main pot first
//        One pot per distinct contribution level of the players still in the hand; every seat's chips (folded
//        ones too) fill each level up to what they put in; folded seats are never eligible. Chips of folded seats
//        above the highest live level (only possible before uncalled bets are returned) join the last pot.
//   oddChipOrder(button, nSeats) -> [seat, ...]   every seat index starting left of the button, button last
//   awardPots(pots, ranks, order) -> [{ pot, seat, amt }]
//        ranks[seat] = comparable hand rank (higher wins) or null/undefined when the seat shows no hand (mucked,
//        folded). Each pot goes to the best ranked eligible seat(s); equal shares; the odd chips go one at a time to
//        the pot's winners in `order`. A pot with no ranked eligible seat is returned to its eligible seats in
//        `order` the same way (never happens in a real hand; kept so chips can never vanish).

export function uncalledBet(amounts) {
  let top = -1, topAmt = 0, second = 0, ties = 0;
  for (let s = 0; s < amounts.length; s++) {
    const a = amounts[s] || 0;
    if (a > topAmt) { second = topAmt; topAmt = a; top = s; ties = 0; }
    else if (a === topAmt && a > 0) ties++;
    else if (a > second) second = a;
  }
  if (top < 0 || ties > 0 || topAmt <= second) return null;
  return { seat: top, amount: topAmt - second };
}

export function buildPots(contrib, folded) {
  const n = contrib.length;
  const levels = [...new Set(
    contrib.map((c, s) => (!folded[s] && c > 0 ? c : 0)).filter((c) => c > 0),
  )].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const lvl of levels) {
    let amt = 0;
    const seats = [];
    for (let s = 0; s < n; s++) {
      const c = contrib[s] || 0;
      amt += Math.max(0, Math.min(c, lvl) - prev);
      if (!folded[s] && c >= lvl) seats.push(s);
    }
    if (amt > 0) pots.push({ amt, seats });
    prev = lvl;
  }
  let rest = 0;
  for (let s = 0; s < n; s++) rest += Math.max(0, (contrib[s] || 0) - prev);
  if (rest > 0) {
    if (pots.length) pots[pots.length - 1].amt += rest;
    else {
      // nobody live put anything in: impossible in a hand; keep the chips with every contributor's pot
      pots.push({ amt: rest, seats: contrib.map((c, s) => (c > 0 ? s : -1)).filter((s) => s >= 0) });
    }
  }
  return pots;
}

export function oddChipOrder(button, nSeats) {
  const out = [];
  for (let i = 1; i <= nSeats; i++) out.push((button + i) % nSeats);
  return out;
}

export function awardPots(pots, ranks, order) {
  const pos = new Map(order.map((s, i) => [s, i]));
  const out = [];
  pots.forEach((pot, pi) => {
    let best = null;
    for (const s of pot.seats) {
      const r = ranks[s];
      if (r === null || r === undefined) continue;
      if (best === null || r > best) best = r;
    }
    let winners = best === null ? pot.seats.slice() : pot.seats.filter((s) => ranks[s] === best);
    winners.sort((a, b) => (pos.get(a) ?? 1e9) - (pos.get(b) ?? 1e9));
    const share = Math.floor(pot.amt / winners.length);
    let odd = pot.amt - share * winners.length;
    for (const s of winners) {
      const amt = share + (odd > 0 ? 1 : 0);
      if (odd > 0) odd--;
      out.push({ pot: pi, seat: s, amt });
    }
  });
  return out;
}
