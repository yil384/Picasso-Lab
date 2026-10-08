// Accounts (DESIGN.md section 4): guests and migration, IP suggestions (fresh only, guests only, same ipKey, 30-day
// expiry on an injected clock), claims, name rules and protection, refills, records, Guandan dedupe, leaderboards.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Accounts, cleanName, nameKey, START_CHIPS, IP_TTL, SID_TTL, PRISTINE_TTL, ESTABLISHED_AGE, ESTABLISHED_HANDS } from '../src/accounts.js';

const SECRET = 'test-games-secret-0123456789abcdefghij';
const IP_A = 'a'.repeat(32);
const IP_B = 'b'.repeat(32);

function setup({ tableInfo } = {}) {
  const clock = { t: 1_700_000_000_000 };
  const events = { changed: 0, account: [], deleted: [] };
  const acc = new Accounts({
    gamesSecret: SECRET,
    now: () => clock.t,
    tableInfo: tableInfo || (() => ({ seated: false, chips: 0 })),
    onChange: () => events.changed++,
    onAccount: (id) => events.account.push(id),
    onDelete: (id) => events.deleted.push(id),
  });
  return { acc, clock, events };
}

const guest = (acc, { name = 'Mei', clientId = 'cid-' + name, fresh = false, ipKey = IP_A } = {}) => {
  const out = acc.session({ account: null, clientId, name, fresh, ipKey });
  return { ...out, a: acc.authenticate(out.token) };
};

// A device with a token visiting again (this is when the IP memory records)
const visit = (acc, token, { ipKey = IP_A, fresh = false, clientId } = {}) => acc.session({ account: acc.authenticate(token), clientId, fresh, ipKey });

test('guest: new account with token, bankroll 10,000, view shape; only the token hash is stored', () => {
  const { acc } = setup();
  const g = guest(acc, { name: '  Mei   Lin ' });
  assert.match(g.token, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(Object.keys(g.account).sort(), ['chips', 'email', 'guandan', 'guest', 'holdem', 'name', 'pid', 'protected', 'refills']);
  assert.equal(g.account.name, 'Mei Lin');
  assert.equal(g.account.chips, START_CHIPS);
  assert.equal(g.account.guest, true);
  assert.equal(g.account.protected, false);
  assert.match(g.a.id, /^u_[a-z2-7]{16}$/);
  assert.match(g.account.pid, /^p_[a-z2-7]{10}$/);
  assert.deepEqual(g.features, { emailLink: false, emailSender: 'firebase' });
  assert.equal(g.suggestions, undefined, 'suggestions only when fresh');
  const saved = JSON.stringify(acc.toJSON());
  assert.ok(!saved.includes(g.token), 'raw token never stored');
  assert.equal(acc.authenticate('x'.repeat(43)), null);
  // a guest with no usable name gets a placeholder
  const anon = guest(acc, { name: '', clientId: 'c2' });
  assert.match(anon.account.name, /^Player \d{4}$/);
});

test('migration: an existing Guandan player keeps name and clientId; a known clientId never signs anyone in', () => {
  const { acc } = setup();
  const first = guest(acc, { name: 'Old Hand', clientId: 'gd-123' });
  assert.deepEqual(first.a.clientIds, ['gd-123']);
  // the same (public) clientId without the token: a new account, not the old one
  const second = acc.session({ account: null, clientId: 'gd-123', name: 'Old Hand', fresh: false, ipKey: IP_A });
  assert.ok(second.token);
  assert.notEqual(second.account.pid, first.account.pid);
  // with the token: the same account, and a new clientId is remembered
  const again = visit(acc, first.token, { clientId: 'gd-456' });
  assert.equal(again.token, undefined, 'no new token for a known device');
  assert.equal(again.account.pid, first.account.pid);
  assert.deepEqual(acc.authenticate(first.token).clientIds, ['gd-123', 'gd-456']);
});

test('IP suggestions: only for fresh browsers, only guests, only the same ipKey, never this account, max 3', () => {
  const { acc } = setup();
  const names = ['Ana', 'Bo', 'Cy', 'Di', 'Ed'];
  const players = names.map((n) => guest(acc, { name: n, clientId: 'c' + n }));
  // a migrated (named, not fresh) guest is remembered on creation; later visits refresh the entry
  for (const p of players) visit(acc, p.token);
  const other = guest(acc, { name: 'Far', clientId: 'cfar', ipKey: IP_B });
  visit(acc, other.token, { ipKey: IP_B });

  const notFresh = acc.session({ account: null, clientId: 'x1', fresh: false, ipKey: IP_A });
  assert.equal(notFresh.suggestions, undefined);
  const fresh = acc.session({ account: null, clientId: undefined, fresh: true, ipKey: IP_A });
  assert.equal(fresh.suggestions.length, 3);
  assert.deepEqual(fresh.suggestions.map((s) => s.name), ['Ed', 'Di', 'Cy'], 'newest first');
  for (const s of fresh.suggestions) assert.match(s.sid, /^[A-Za-z0-9_-]{24}$/);
  // other network: only its own guest
  const freshB = acc.session({ account: null, fresh: true, ipKey: IP_B });
  assert.deepEqual(freshB.suggestions.map((s) => s.name), ['Far']);
  // a brand-new fresh guest (no name) is not remembered for the network
  const freshC = acc.session({ account: null, fresh: true, ipKey: 'c'.repeat(32) });
  assert.deepEqual(freshC.suggestions, []);
  // max 5 entries per key
  assert.equal(acc.toJSON().ip[IP_A].length, 5);
  // an email account is never suggested (and its entries are removed when it saves)
  const ed = acc.authenticate(players[4].token);
  ed.email = { uid: 'u', masked: 'e***@x.org', hash: 'h', linkedAt: 1 };
  const fresh2 = acc.session({ account: null, fresh: true, ipKey: IP_A });
  assert.deepEqual(fresh2.suggestions.map((s) => s.name), ['Di', 'Cy', 'Bo']);
  // and an email account's visits are never recorded
  const before = JSON.stringify(acc.toJSON().ip[IP_A]);
  visit(acc, players[4].token);
  assert.equal(JSON.stringify(acc.toJSON().ip[IP_A]), before);
  // nothing in the saved data looks like an IP address
  const saved = JSON.stringify(acc.toJSON());
  assert.doesNotMatch(saved, /\d+\.\d+\.\d+\.\d+/);
  // a device that already has a token gets no suggestions, even if it says fresh
  assert.deepEqual(visit(acc, players[0].token, { fresh: true }).suggestions, []);
});

test('IP memory expires after 30 days (sweep) and suggestions skip stale entries', () => {
  const { acc, clock } = setup();
  const p = guest(acc, { name: 'Iris' });
  visit(acc, p.token);
  clock.t += IP_TTL - 60_000;
  assert.deepEqual(acc.session({ account: null, fresh: true, ipKey: IP_A }).suggestions.map((s) => s.name), ['Iris']);
  clock.t += 120_000;
  assert.deepEqual(acc.session({ account: null, fresh: true, ipKey: IP_A }).suggestions, [], 'stale entries are never suggested');
  acc.sweep();
  assert.equal(acc.toJSON().ip[IP_A], undefined, 'swept');
});

test('claims: one click, same ipKey, 10 minutes, guest only; the caller keeps its own account under the name', () => {
  const { acc, clock, events } = setup();
  const old = guest(acc, { name: 'Juno' });
  visit(acc, old.token);
  old.a.chips = 7_300;
  const tokensBefore = old.a.tokens.length;
  const fresh = acc.session({ account: null, fresh: true, ipKey: IP_A });
  const freshAcc = acc.authenticate(fresh.token);
  const sid = fresh.suggestions[0].sid;
  // another network cannot use it
  assert.throws(() => acc.claim(freshAcc, sid, IP_B), (e) => e.status === 403 && e.code === 'ip_mismatch');
  // unknown sid
  assert.throws(() => acc.claim(freshAcc, 'nope', IP_A), (e) => e.status === 404 && e.code === 'expired');
  const out = acc.claim(freshAcc, sid, IP_A);
  assert.equal(out.token, undefined, 'no token for anyone');
  assert.equal(out.account.pid, freshAcc.pid, 'the caller keeps its own account');
  assert.equal(out.account.name, 'Juno', 'under the suggested name');
  assert.equal(out.account.chips, START_CHIPS, 'with its own chips');
  assert.equal(acc.authenticate(fresh.token).id, freshAcc.id);
  assert.deepEqual(events.deleted, []);
  assert.equal(old.a.tokens.length, tokensBefore, 'the other account gets no new token');
  assert.equal(acc.authenticate(old.token).id, old.a.id, 'the old device keeps its account');
  assert.equal(old.a.chips, 7_300);
  // single use
  assert.throws(() => acc.claim(freshAcc, sid, IP_A), (e) => e.code === 'expired');
  // the network now remembers the name once
  const again = acc.session({ account: null, fresh: true, ipKey: IP_A });
  assert.deepEqual(again.suggestions.map((x) => x.name), ['Juno'], 'one entry per name');

  // expiry after 10 minutes
  const f2 = acc.session({ account: null, fresh: true, ipKey: IP_A });
  clock.t += SID_TTL + 1;
  assert.throws(() => acc.claim(acc.authenticate(f2.token), f2.suggestions[0].sid, IP_A), (e) => e.code === 'expired');

  // a guest that saved with an email in the meantime cannot be claimed
  const f3 = acc.session({ account: null, fresh: true, ipKey: IP_A });
  old.a.email = { uid: 'u', masked: 'j***@x.org', hash: 'h2', linkedAt: clock.t };
  acc._reindex();
  assert.throws(() => acc.claim(acc.authenticate(f3.token), f3.suggestions[0].sid, IP_A), (e) => e.status === 409 && e.code === 'protected');
});

test('a claim never hands over a seat, a bankroll or a record: whoever shares the network gets a name only', () => {
  const { acc } = setup({ tableInfo: () => ({ seated: true, chips: 2000 }) });
  const victor = guest(acc, { name: 'Victor' });
  visit(acc, victor.token);
  victor.a.holdem.hands = 120;
  victor.a.chips = 9_000;
  const f = acc.session({ account: null, fresh: true, ipKey: IP_A });
  const claimer = acc.authenticate(f.token);
  const out = acc.claim(claimer, f.suggestions[0].sid, IP_A);
  assert.equal(out.account.name, 'Victor');
  assert.notEqual(out.account.pid, victor.a.pid);
  assert.equal(out.account.holdem.hands, 0);
  assert.equal(out.account.chips, START_CHIPS);
  // no token issued by the claim reaches Victor's account
  assert.ok(victor.a.tokens.every((x) => x.createdAt <= victor.a.createdAt));
  assert.equal(acc.get(victor.a.id).chips, 9_000);
});

test('names: rules, and protection of names held by email accounts (case and space insensitive)', () => {
  const { acc, clock } = setup();
  assert.equal(cleanName('  Yu   Fei '), 'Yu Fei');
  assert.equal(cleanName(''), null);
  assert.equal(cleanName('   '), null);
  assert.equal(cleanName('x'.repeat(25)), null);
  assert.equal(cleanName('好'.repeat(24)), '好'.repeat(24));
  assert.equal(cleanName('bad\u0000name'), null);
  assert.equal(cleanName('rtl‮evil'), null);
  assert.equal(cleanName(42), null);
  assert.equal(nameKey('Yu Fei'), nameKey('yufei'));
  assert.equal(nameKey('ＹＵＦＥＩ'), nameKey('yufei'), 'full-width folds too');

  const owner = guest(acc, { name: 'Yu Fei' });
  const other = guest(acc, { name: 'Someone' });
  // guests may share names
  assert.equal(acc.setName(other.a, 'yu fei').account.name, 'yu fei');
  assert.equal(acc.nameAllowed(other.a), true);
  // owner saves with email: the name becomes protected
  owner.a.email = { uid: 'u1', masked: 'y***@ucsd.edu', hash: 'h1', linkedAt: clock.t };
  acc._reindexNames();
  assert.equal(acc.view(owner.a).protected, true);
  assert.equal(acc.nameAllowed(other.a), false, 'the guest can no longer sit with it');
  assert.throws(() => acc.setName(other.a, 'YUFEI'), (e) => e.status === 409 && e.code === 'name_protected');
  assert.throws(() => acc.setName(other.a, 'Yu  Fei'), (e) => e.code === 'name_protected');
  assert.throws(() => acc.setName(other.a, ''), (e) => e.status === 400 && e.code === 'bad_name');
  assert.equal(acc.setName(other.a, 'Yu Fei 2').account.name, 'Yu Fei 2');
  // a new guest asking for a protected name gets a placeholder instead
  const g = guest(acc, { name: 'yufei', clientId: 'cx' });
  assert.match(g.account.name, /^Player \d{4}$/);
  // the owner renames: the old name is free again, the new one protected
  acc.setName(owner.a, 'Professor');
  assert.equal(acc.nameHolder('yu fei'), null);
  assert.equal(acc.nameHolder('professor'), owner.a.id);
  // a second email account holding the same name is saved but not protected (first linked wins)
  const twin = guest(acc, { name: 'Professor', clientId: 'tw' });
  assert.match(twin.account.name, /^Player \d{4}$/, 'a guest cannot start with it either');
  twin.a.name = 'Professor'; // e.g. a guest named so before the owner saved
  twin.a.email = { uid: 'u2', masked: 't***@ucsd.edu', hash: 'h2', linkedAt: clock.t + 5 };
  acc._reindexNames();
  assert.equal(acc.view(twin.a).protected, false);
  assert.equal(acc.view(owner.a).protected, true);
  assert.throws(() => acc.setName(twin.a, 'professor'), (e) => e.code === 'name_protected');
});

test('refill: only below 2,000 with nothing at a table; sets 10,000 and counts', () => {
  let atTable = 0;
  const { acc, events } = setup({ tableInfo: () => ({ seated: atTable > 0, chips: atTable }) });
  const g = guest(acc);
  assert.throws(() => acc.refill(g.a), (e) => e.status === 409 && e.code === 'not_needed');
  g.a.chips = 1999;
  atTable = 500;
  assert.throws(() => acc.refill(g.a), (e) => e.code === 'not_needed');
  atTable = 0;
  const out = acc.refill(g.a);
  assert.equal(out.account.chips, 10_000);
  assert.equal(out.account.refills, 1);
  assert.ok(events.account.includes(g.a.id));
  g.a.chips = 2000;
  assert.throws(() => acc.refill(g.a), (e) => e.code === 'not_needed', '2,000 is not below 2,000');
});

test('refill: once a day per account and at most 5 a day per network (chip dumping is not free)', () => {
  const { acc, clock } = setup({ tableInfo: () => ({ seated: false, chips: 0 }) });
  const g = guest(acc);
  g.a.chips = 0;
  acc.refill(g.a, 'net1');
  g.a.chips = 0;
  assert.throws(() => acc.refill(g.a, 'net2'), (e) => e.status === 429 && e.code === 'refill_later');
  clock.t += 24 * 3600_000;
  assert.equal(acc.refill(g.a, 'net2').account.refills, 2);
  for (let k = 0; k < 5; k++) { const o = guest(acc, { name: 'N' + k }); o.a.chips = 0; acc.refill(o.a, 'net1'); }
  const late = guest(acc, { name: 'Late' });
  late.a.chips = 0;
  assert.throws(() => acc.refill(late.a, 'net1'), (e) => e.code === 'refill_later', 'a sixth refill from one network in a day');
  assert.equal(acc.refill(late.a, 'net3').account.chips, 10_000);
});

test('records: Hold\'em from settlements; Guandan self-reported, deduped by room:round (last 200 keys)', () => {
  const { acc } = setup();
  const g = guest(acc);
  const touched = acc.applySettlements({
    chips: [{ accountId: g.a.id, amount: -2000, reason: 'buyin' }, { accountId: 'u_gone', amount: 50, reason: 'cashout' }],
    records: [
      { accountId: g.a.id, hands: 1, won: 1, biggestPot: 400, net: 180, showdowns: 1 },
      { accountId: g.a.id, hands: 1, won: 0, biggestPot: 0, net: -60, showdowns: 0 },
      { accountId: g.a.id, hands: 1, won: 1, biggestPot: 900, net: 450, showdowns: 0 },
    ],
  });
  assert.deepEqual([...touched], [g.a.id]);
  assert.equal(g.a.chips, 8000);
  assert.deepEqual(acc.view(g.a).holdem, { hands: 3, won: 2, biggestPot: 900, net: 570, showdowns: 1, rnet: 570 });

  assert.deepEqual(acc.guandanRound(g.a, { room: 'ABCD', round: 1, won: true, place: 1 }), { ok: true });
  assert.deepEqual(acc.guandanRound(g.a, { room: 'ABCD', round: 1, won: true, place: 1 }), { ok: true, duplicate: true });
  acc.guandanRound(g.a, { room: 'ABCD', round: 2, won: false, place: 3 });
  acc.guandanRound(g.a, { room: 'WXYZ', round: 1, won: false, place: 0 });
  assert.deepEqual(acc.view(g.a).guandan, { rounds: 3, wins: 1 });
  assert.throws(() => acc.guandanRound(g.a, { room: 'A B', round: 1, won: true }), (e) => e.status === 400);
  assert.throws(() => acc.guandanRound(g.a, { room: 'ABCD', round: '1', won: true }), (e) => e.status === 400);
  assert.throws(() => acc.guandanRound(g.a, { room: 'ABCD', round: 3, won: 'yes' }), (e) => e.status === 400);
  for (let r = 10; r < 260; r++) acc.guandanRound(g.a, { room: 'R', round: r, won: false });
  assert.equal(Object.keys(g.a.guandan.seen).length, 200);
  assert.ok(!g.a.guandan.seen['ABCD:1'], 'oldest keys dropped');
  assert.equal(g.a.guandan.seen['R:259'], 1);
});

test('Hold\'em ranking: chips lost by fresh accounts (chip dumping) never count; from established ones they do', () => {
  const { acc, clock } = setup();
  const main = guest(acc, { name: 'Main', clientId: 'c-main' }).a;
  const vet = guest(acc, { name: 'Vet', clientId: 'c-vet' }).a;
  const dump = guest(acc, { name: 'Dump', clientId: 'c-dump' }).a;
  clock.t += ESTABLISHED_AGE;
  vet.holdem.hands = ESTABLISHED_HANDS;
  main.holdem.hands = ESTABLISHED_HANDS;
  const rec = (a, net, hand, gain) => ({ accountId: a.id, hands: 1, won: net > 0 ? 1 : 0, biggestPot: Math.max(0, net), net, showdowns: 0, hand, gain });
  // a fresh guest dumps 9,000 to the main account: it shows in net but not in the ranked net
  acc.applySettlements({ records: [rec(main, 9000, 'T-1', 9000), rec(dump, -9000, 'T-1', 9000)] });
  assert.equal(main.holdem.net, 9000);
  assert.equal(main.holdem.rnet, 0);
  // a pot of 3,000 fed half by the fresh guest and half by an established player: half the gain is ranked
  acc.applySettlements({ records: [rec(main, 3000, 'T-2', 3000), rec(dump, -1500, 'T-2', 3000), rec(vet, -1500, 'T-2', 3000)] });
  assert.equal(main.holdem.rnet, 1500);
  // won from bots (no record; the gain comes from chips no fresh account lost): all of it counts
  acc.applySettlements({ records: [rec(main, 400, 'T-3', 400)] });
  assert.equal(main.holdem.rnet, 1900);
  assert.equal(dump.holdem.rnet, -10500, 'losses always count');
  const h = acc.leaderboard('holdem', 50, main);
  assert.equal(h.rows.find((r) => r.name === 'Main').net, 1900, 'the ranking shows and sorts by the ranked net');
  assert.deepEqual(h.rows.map((r) => r.name), ['Main', 'Vet'], 'the fresh guest does not rank');
});

test('Hold\'em ranking: only established accounts rank, so a throwaway guest\'s lucky hands never do', () => {
  const { acc, clock } = setup();
  const regular = guest(acc, { name: 'Regular', clientId: 'c-reg' }).a;
  clock.t += 30 * 24 * 3600_000;
  Object.assign(regular.holdem, { hands: 2000, net: 15_000, rnet: 15_000 });
  const lucky = [];
  for (let i = 0; i < 20; i++) lucky.push(guest(acc, { name: `Guest${i}`, clientId: `c-g${i}` }).a);
  // five of twenty one-hand guests win about 30,000 from bots; the rest bust (losses to bots rank for nobody)
  const rec = (a, net, hand) => ({ accountId: a.id, hands: 1, won: net > 0 ? 1 : 0, biggestPot: Math.max(0, net), net, showdowns: 1, hand, gain: Math.max(net, 0) });
  acc.applySettlements({ records: lucky.map((a, i) => rec(a, i < 5 ? 30_000 : -10_000, `B-${i}`)) });
  const h = acc.leaderboard('holdem', 50, lucky[0]);
  assert.deepEqual(h.rows.map((r) => r.name), ['Regular']);
  assert.equal(h.me.rank, null, 'a fresh account sees its own row, unranked');
  assert.equal(h.me.net, 30_000);
  assert.deepEqual(h.rule, { days: 3, hands: 50 });
  // after 3 days and 50 hands the same account ranks with everything it won and lost meanwhile
  clock.t += ESTABLISHED_AGE;
  lucky[0].holdem.hands = ESTABLISHED_HANDS;
  assert.deepEqual(acc.leaderboard('holdem').rows.map((r) => r.name), ['Guest0', 'Regular']);
  // a merge carries a fresh guest's losses into the saved account, never its lucky gains
  const saved = guest(acc, { name: 'Saved', clientId: 'c-saved' }).a;
  Object.assign(saved.holdem, { hands: 80, net: 500, rnet: 500 });
  acc._merge(lucky[1], saved);
  assert.equal(saved.holdem.rnet, 500);
  acc._merge(lucky[6], saved);
  assert.equal(saved.holdem.rnet, -9_500);
});

test('leaderboards: Hold\'em by net, Guandan by wins; only players with games; me row with rank', () => {
  const { acc, clock } = setup();
  const mk = (name, holdem, guandan) => {
    const g = guest(acc, { name, clientId: 'c' + name });
    Object.assign(g.a.holdem, holdem);
    Object.assign(g.a.guandan, guandan);
    return g.a;
  };
  const a = mk('A', { hands: 60, net: 500, won: 4, biggestPot: 800 }, { rounds: 10, wins: 3 });
  const b = mk('B', { hands: 50, net: 1500, won: 20, biggestPot: 300 }, { rounds: 4, wins: 3 });
  const c = mk('C', { hands: 55, net: -200 }, { rounds: 0, wins: 0 });
  const d = mk('D', { hands: 0, net: 0 }, { rounds: 20, wins: 9 });
  clock.t += ESTABLISHED_AGE;
  const h = acc.leaderboard('holdem', 50, c);
  assert.deepEqual(h.rows.map((r) => r.name), ['B', 'A', 'C']);
  assert.deepEqual(Object.keys(h.rows[0]).sort(), ['biggestPot', 'chips', 'hands', 'name', 'net', 'pid', 'rank', 'won']);
  assert.equal(h.me.rank, 3);
  assert.equal(h.me.pid, c.pid);
  const g = acc.leaderboard('guandan', 2, a);
  assert.deepEqual(g.rows.map((r) => r.name), ['D', 'B'], 'wins, then fewer rounds');
  assert.deepEqual(Object.keys(g.rows[0]).sort(), ['name', 'pid', 'rank', 'rounds', 'wins']);
  assert.equal(g.me.rank, 3);
  assert.equal(acc.leaderboard('holdem', 50, d).me.rank, null);
  assert.ok(!JSON.stringify(h).includes(a.id), 'internal ids never leave');
  assert.throws(() => acc.leaderboard('chess'), (e) => e.status === 400);
});

test('tokens: max 10 per account (oldest dropped); sign-out revokes only that device', () => {
  const { acc, clock } = setup();
  const g = guest(acc);
  const tokens = [g.token];
  for (let i = 0; i < 10; i++) { clock.t += 1000; tokens.push(acc._issueToken(g.a)); }
  assert.equal(g.a.tokens.length, 10);
  assert.equal(acc.authenticate(tokens[0]), null, 'the oldest token was dropped');
  assert.ok(acc.authenticate(tokens[1]));
  acc.signout(tokens[1]);
  assert.equal(acc.authenticate(tokens[1]), null);
  assert.ok(acc.authenticate(tokens[2]));
});

test('pristine guests unseen for 90 days are swept; anyone who played or saved is kept', () => {
  const { acc, clock } = setup();
  const idle = guest(acc, { name: 'Idle', clientId: 'i' });
  const played = guest(acc, { name: 'Played', clientId: 'p' });
  played.a.holdem.hands = 1;
  clock.t += PRISTINE_TTL + 1000;
  acc.sweep();
  assert.equal(acc.get(idle.a.id), null);
  assert.ok(acc.get(played.a.id));
});

test('persistence round-trip keeps tokens, IP memory, names and protection', () => {
  const { acc, clock } = setup();
  const g = guest(acc, { name: 'Lane' });
  visit(acc, g.token);
  g.a.email = { uid: 'u', masked: 'l***@x.org', hash: 'hh', linkedAt: clock.t };
  acc._reindex();
  const copy = new Accounts({ gamesSecret: SECRET, now: () => clock.t });
  copy.load(JSON.parse(JSON.stringify(acc.toJSON())));
  assert.equal(copy.authenticate(g.token).id, g.a.id);
  assert.equal(copy.nameHolder('LANE'), g.a.id);
  assert.equal(copy.byPublicId(g.account.pid).id, g.a.id);
});
