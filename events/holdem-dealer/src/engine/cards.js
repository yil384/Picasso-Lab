// Cards: deck, encoding, shuffle.
//
// A card is a two-character string: rank "23456789TJQKA" + suit "shdc" ("As", "Td", "2c").
// Internally (evaluator, AI) a card is also an int 0..51: idx = rankIndex * 4 + suitIndex,
// rankIndex 0..12 for 2..A, suitIndex 0..3 for s,h,d,c.
//
// Randomness: an rng is a function rng(n) -> integer in [0, n). The default is cryptoRng
// (crypto.randomInt, used by the dealer for every real shuffle). Tests inject seededRng(seed),
// a deterministic generator whose state can be read and copied.
//
// Exports
//   RANKS, SUITS                      "23456789TJQKA", "shdc"
//   newDeck() -> string[52]           ordered deck (2s 2h 2d 2c 3s ... Ac)
//   shuffle(arr, rng = cryptoRng)     in-place Fisher-Yates, returns arr
//   shuffledDeck(rng = cryptoRng)     newDeck() shuffled
//   cryptoRng(n)                      crypto.randomInt(n)
//   seededRng(seed) -> rng            deterministic (mulberry32); rng.state() / rng.clone()
//   cardIndex("As") -> 51, cardStr(51) -> "As", rankOf(card) 0..12, suitOf(card) 0..3
//   isCard(x) -> bool                 valid two-character card string

import { randomInt } from 'node:crypto';

export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';

const STR = [];
const IDX = new Map();
for (let r = 0; r < 13; r++) {
  for (let s = 0; s < 4; s++) {
    const c = RANKS[r] + SUITS[s];
    IDX.set(c, STR.length);
    STR.push(c);
  }
}

export function newDeck() {
  return STR.slice();
}

export function cryptoRng(n) {
  return randomInt(n);
}

export function shuffle(arr, rng = cryptoRng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) throw new Error('rng out of range');
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

export function shuffledDeck(rng = cryptoRng) {
  return shuffle(newDeck(), rng);
}

// mulberry32: tiny, fast, good enough for tests and simulations (never for real shuffles).
export function seededRng(seed = 1) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const rng = (n) => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return Math.floor(u * n);
  };
  rng.state = () => a;
  rng.clone = () => { const r = seededRng(1); r.setState(a); return r; };
  rng.setState = (s) => { a = s | 0; };
  return rng;
}

export function cardIndex(c) {
  const i = IDX.get(c);
  if (i === undefined) throw new Error('bad card ' + c);
  return i;
}

export function cardStr(i) {
  return STR[i];
}

export function isCard(c) {
  return typeof c === 'string' && IDX.has(c);
}

export function rankOf(c) {
  return typeof c === 'number' ? c >> 2 : RANKS.indexOf(c[0]);
}

export function suitOf(c) {
  return typeof c === 'number' ? c & 3 : SUITS.indexOf(c[1]);
}
