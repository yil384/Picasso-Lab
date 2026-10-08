// Save with email when the service sends the email itself (EMAIL_SENDER=resend), over HTTP against a fake Resend
// (the mailer's fetch is injected; nothing leaves the machine): the request Resend gets (body, headers, idempotency),
// the email (bilingual, one button, the raw link, no image, no emoji), the single-use token (wrong, malformed, replay,
// expiry), the device code, the merge on a second device, every limit (network, address, daily cap, across a
// restart), Resend's refusals and outages, the config checks, and that neither the address nor the key is ever stored
// or logged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { startTest, api, newGuest, randomIp, tmpDir, connect, fakeResend } from './service-helpers.js';
import { LINK_TTL, MAIL_PER_ADDRESS_HOUR } from '../src/accounts.js';
import { loadConfig, ConfigError } from '../src/config.js';
import { createResendMailer, MailError, signInEmail, linkUrl, SUBJECT, LINK_PAGE } from '../src/mailer.js';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
// a made-up key in a temp file: the format of a Resend key, valid nowhere
const KEY = `re_test_${'k'.repeat(10)}_${Date.now().toString(36)}`;
const keyFile = path.join(tmpDir('resend-key-'), 'resend_api_key');
fs.writeFileSync(keyFile, `${KEY}\n`, { mode: 0o600 });

const clock = { offset: 0 };
const now = () => Date.now() + clock.offset;
const resend = fakeResend();
const lines = [];
const log = (msg, fields = {}) => lines.push(JSON.stringify({ msg, ...fields }));
const ENV = { EMAIL_LINK: 'on', EMAIL_SENDER: 'resend', RESEND_API_KEY_FILE: keyFile };
let svc;
test.before(async () => {
  svc = await startTest(ENV, { now, mailFetch: resend.fetch, log });
});
test.after(async () => { await svc.stop(); });

const start = (guest, email, { lang, ip = randomIp(), on = svc } = {}) => api(on, 'POST', '/v1/email/start', {
  token: guest.token, body: lang ? { email, lang } : { email }, headers: { 'x-forwarded-for': ip },
});
const redeem = (body, on = svc) => api(on, 'POST', '/v1/email/redeem', { body, headers: { 'x-forwarded-for': randomIp() } });
const poll = (lid, p, on = svc) => api(on, 'POST', '/v1/email/poll', { body: { lid, poll: p } });

// the link in a captured email: the same in the text and the HTML part
function linkOf(call) {
  const m = /https:\/\/\S+account-link\.html\?\S+/.exec(call.body.text);
  assert.ok(m, 'a link in the text part');
  const url = new URL(m[0]);
  assert.ok(call.body.html.includes(m[0].replaceAll('&', '&amp;')), 'the same link in the HTML part');
  return { url: m[0], lid: url.searchParams.get('lid'), t: url.searchParams.get('t'), lang: url.searchParams.get('lang') };
}

test('start sends one email through Resend: the request, its headers, the sender and the reply', async () => {
  resend.reset();
  const g = await newGuest(svc, 'Mei');
  const r = await start(g, '  Mei.Lin@UCSD.edu ');
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.sent, true);
  assert.equal(r.data.from, 'noreply@picasso-lab.com');
  assert.match(r.data.code, /^\d{4}$/);
  assert.deepEqual(Object.keys(r.data).sort(), ['code', 'from', 'lid', 'poll', 'sent']);
  assert.equal(resend.calls.length, 1);
  const [c] = resend.calls;
  assert.equal(c.url, 'https://api.resend.com/emails');
  assert.equal(c.method, 'POST');
  assert.equal(c.headers.authorization, `Bearer ${KEY}`);
  assert.equal(c.headers['content-type'], 'application/json');
  assert.equal(c.headers['idempotency-key'], `picasso-signin-${r.data.lid}`);
  assert.deepEqual(Object.keys(c.body).sort(), ['from', 'headers', 'html', 'subject', 'text', 'to']);
  assert.equal(c.body.from, 'Picasso Lab <noreply@picasso-lab.com>');
  assert.deepEqual(c.body.to, ['Mei.Lin@UCSD.edu']);
  assert.equal(c.body.subject, 'Picasso Lab 游戏登录 / Sign in to Picasso Lab games');
  assert.match(c.body.headers['X-Entity-Ref-ID'], /^[A-Za-z0-9_-]{16}$/);
  const link = linkOf(c);
  assert.ok(link.url.startsWith(`${LINK_PAGE}?lid=`));
  assert.equal(link.lid, r.data.lid);
  assert.match(link.t, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(link.lang, 'zh');
  const s = await api(svc, 'POST', '/v1/session', { token: g.token, body: {} });
  assert.deepEqual(s.data.features, { emailLink: true, emailSender: 'resend' });
  // the service logs the send (Resend's id and the day's count), never the address, the link or the key
  const sent = lines.filter((l) => l.includes('sign-in email sent'));
  assert.ok(sent.length >= 1);
  assert.deepEqual(Object.keys(JSON.parse(sent.at(-1))).sort(), ['cap', 'id', 'last24h', 'last30d', 'msg']);
});

test('the email: bilingual (Chinese first for zh, English first for en), one button, the raw link, expiry, ignore', async () => {
  resend.reset();
  const zh = await newGuest(svc, 'Lan');
  await start(zh, 'lan@ucsd.edu', { lang: 'zh' });
  const en = await newGuest(svc, 'Ann');
  await start(en, 'ann@ucsd.edu', { lang: 'en' });
  const bad = await newGuest(svc, 'Odd');
  await start(bad, 'odd@ucsd.edu', { lang: '<script>' });
  assert.equal(resend.calls.length, 3);
  const [a, b, c] = resend.calls.map((x) => x.body);
  assert.equal(linkOf(resend.calls[1]).lang, 'en');
  assert.equal(linkOf(resend.calls[2]).lang, 'zh', 'anything else is zh');
  assert.ok(a.text.indexOf('打开下面的链接') < a.text.indexOf('Open the link below'), 'zh: Chinese first');
  assert.ok(b.text.indexOf('Open the link below') < b.text.indexOf('打开下面的链接'), 'en: English first');
  assert.ok(a.html.indexOf('登录并保存账号') > 0 && !a.html.includes('Sign in and save'), 'one button, in the first language');
  assert.ok(b.html.includes('Sign in and save') && !b.html.includes('登录并保存账号'));
  for (const m of [a, b, c]) {
    const url = linkOf({ body: m }).url;
    assert.ok(m.text.includes('30 分钟') && m.text.includes('30 minutes'), 'the expiry in both languages');
    assert.ok(m.text.includes('请忽略这封邮件') && m.text.includes('If you did not ask for this, ignore this email'));
    assert.ok(m.html.includes('请忽略这封邮件') && m.html.includes('If you did not ask for this, ignore this email'));
    assert.ok(m.text.includes('Picasso Lab') && m.html.includes('PICASSO LAB'), 'the lab name');
    assert.equal((m.html.match(/<a /g) || []).length, 2, 'the button and the raw link, nothing else');
    const hrefs = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replaceAll('&amp;', '&'));
    assert.deepEqual(hrefs, [url, url]);
    assert.ok(!/<img|<script|<link |url\(|@import|<style/i.test(m.html), 'no image, tracking pixel, script or external style');
    assert.ok(!/\p{Extended_Pictographic}/u.test(m.text + m.html), 'no emoji');
    assert.match(m.html, /max-width:520px/);
    assert.match(m.html, /<table role="presentation"/);
    assert.ok(m.html.includes('word-break:break-all'), 'the raw link wraps on a phone');
    assert.equal(m.subject, SUBJECT);
  }
});

test('the token: wrong, malformed and unknown links look the same; the code is needed; single use; replay refused', async () => {
  resend.reset();
  const g = await newGuest(svc, 'Ning');
  const r = await start(g, 'ning@ucsd.edu');
  const { lid, t } = linkOf(resend.calls[0]);
  const other = `${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`;
  for (const body of [{ lid, t: other }, { lid, t: t.slice(1) }, { lid, t: `${t}x` }, { lid, t: 123 }, { lid }, { lid: 'nope', t }, { t }]) {
    const x = await redeem(body);
    assert.equal(x.status, 404, JSON.stringify(body));
    assert.equal(x.data.error, 'expired');
  }
  // opened on another device (no code): nothing is bound, the token still works
  const asked = await redeem({ lid, t });
  assert.equal(asked.status, 409);
  assert.deepEqual([asked.data.error, asked.data.merge], ['need_code', false]);
  const wrong = String((Number(r.data.code) + 1) % 10_000).padStart(4, '0');
  const bad = await redeem({ lid, t, code: wrong });
  assert.deepEqual([bad.status, bad.data.error], [409, 'bad_code']);
  assert.equal(svc.accounts.get(g.id).email, null);
  assert.deepEqual((await poll(lid, r.data.poll)).data, { status: 'pending' });
  // the code from the device that asked: saved
  const ok = await redeem({ lid, t, code: r.data.code });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.deepEqual(ok.data, { ok: true, name: 'Ning', nameReserved: true });
  // used: a replay changes nothing
  const replay = await redeem({ lid, t, code: r.data.code });
  assert.deepEqual([replay.status, replay.data.error], [409, 'used']);
  assert.deepEqual([(await redeem({ lid, t: other })).status], [404]);
  // the waiting page picks it up once, as with a Firebase link
  const done = await poll(lid, r.data.poll);
  assert.equal(done.data.status, 'done');
  assert.equal(done.data.account.pid, g.account.pid);
  assert.equal(done.data.account.email, 'n***@ucsd.edu');
  assert.equal(done.data.account.protected, true);
  assert.equal((await api(svc, 'GET', '/v1/me', { token: g.token })).status, 401, 'the starting token was replaced');
  assert.equal((await poll(lid, r.data.poll)).data.error, 'expired');
  assert.equal((await redeem({ lid, t, code: r.data.code })).data.error, 'expired', 'after the poll the link is gone');
  // the token was never stored, only its hash; nor the address
  svc.store.flush();
  const text = fs.readFileSync(`${svc.config.dataDir}/accounts.json`, 'utf8');
  assert.ok(!text.includes(t));
  assert.ok(!/ning@/i.test(text));
});

test('five wrong codes drop the link; a Firebase link (no token) cannot be redeemed', async () => {
  resend.reset();
  const g = await newGuest(svc, 'Pat');
  const r = await start(g, 'pat@ucsd.edu');
  const { lid, t } = linkOf(resend.calls[0]);
  const wrong = String((Number(r.data.code) + 7) % 10_000).padStart(4, '0');
  for (let k = 0; k < 4; k++) assert.equal((await redeem({ lid, t, code: wrong })).data.error, 'bad_code');
  assert.equal((await redeem({ lid, t, code: wrong })).data.error, 'expired');
  assert.equal((await redeem({ lid, t, code: r.data.code })).data.error, 'expired');
  // a link made by the Firebase sender has no token
  const fb = await startTest({ EMAIL_LINK: 'on' }, { mailFetch: resend.fetch });
  try {
    resend.reset();
    const h = await newGuest(fb, 'Fb');
    const s = await start(h, 'fb@ucsd.edu', { on: fb });
    assert.equal(s.status, 200);
    assert.equal(s.data.sent, false, 'the page sends it through Firebase');
    assert.equal(resend.calls.length, 0, 'the service sent nothing');
    const x = await redeem({ lid: s.data.lid, t: 'A'.repeat(43), code: s.data.code }, fb);
    assert.deepEqual([x.status, x.data.error], [404, 'expired']);
    assert.deepEqual((await api(fb, 'POST', '/v1/session', { body: {} })).data.features, { emailLink: true, emailSender: 'firebase' });
  } finally {
    await fb.stop();
  }
  // with the flag off the redeem is disabled like the rest
  const off = await startTest({ EMAIL_LINK: 'off', EMAIL_SENDER: 'resend', RESEND_API_KEY_FILE: keyFile }, { mailFetch: resend.fetch });
  try {
    assert.equal((await redeem({ lid: 'x', t: 'y' }, off)).data.error, 'disabled');
  } finally {
    await off.stop();
  }
});

test('expiry: 30 minutes after the start the token no longer works', async () => {
  resend.reset();
  const g = await newGuest(svc, 'Late');
  const r = await start(g, 'late@ucsd.edu');
  const { lid, t } = linkOf(resend.calls[0]);
  clock.offset += LINK_TTL + 1000;
  try {
    const x = await redeem({ lid, t, code: r.data.code });
    assert.deepEqual([x.status, x.data.error], [404, 'expired']);
    assert.equal((await poll(lid, r.data.poll)).status, 404);
    assert.equal(svc.accounts.get(g.id).email, null);
  } finally {
    clock.offset = 0;
  }
});

test('second device: the guest merges into the account saved under that email (today\'s rules)', async () => {
  resend.reset();
  const first = await newGuest(svc, 'Main R');
  const s1 = await start(first, 'main.r@ucsd.edu');
  const l1 = linkOf(resend.calls[0]);
  assert.equal((await redeem({ lid: l1.lid, t: l1.t, code: s1.data.code })).status, 200);
  const d1 = await poll(l1.lid, s1.data.poll);
  const A = svc.accounts.byPublicId(first.account.pid);
  Object.assign(A.holdem, { hands: 10, won: 3, biggestPot: 500, net: 200, showdowns: 2 });
  A.chips = 7000;
  const phone = await newGuest(svc, 'Phone R');
  const B = svc.accounts.get(phone.id);
  Object.assign(B.holdem, { hands: 4, won: 2, biggestPot: 900, net: -50, showdowns: 1 });
  B.guandan.rounds = 2; B.guandan.wins = 1;
  B.chips = 25_000;
  const s2 = await start(phone, 'MAIN.R@ucsd.edu', { lang: 'en' });
  const l2 = linkOf(resend.calls[1]);
  // opened on the first device (which has no code for this link): it says a merge, binds nothing
  const asked = await redeem({ lid: l2.lid, t: l2.t });
  assert.deepEqual([asked.data.error, asked.data.merge], ['need_code', true]);
  const ok = await redeem({ lid: l2.lid, t: l2.t, code: s2.data.code });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.name, 'Main R');
  const d2 = await poll(l2.lid, s2.data.poll);
  assert.equal(d2.data.status, 'done');
  assert.equal(d2.data.account.pid, first.account.pid);
  assert.equal(d2.data.account.chips, 7000, "B's bankroll is dropped");
  assert.deepEqual(d2.data.account.holdem, { hands: 14, won: 5, biggestPot: 900, net: 150, showdowns: 3, rnet: 150 });
  assert.deepEqual(d2.data.account.guandan, { rounds: 2, wins: 1 });
  assert.equal(svc.accounts.get(phone.id), null, 'B is deleted');
  assert.equal((await api(svc, 'GET', '/v1/me', { token: d1.data.token })).data.account.pid, first.account.pid);
  assert.equal((await api(svc, 'GET', '/v1/me', { token: d2.data.token })).data.account.pid, first.account.pid);
});

test('a merge is refused while the guest sits at a Hold\'em table; the token stays valid until it leaves', async () => {
  resend.reset();
  const owner = await newGuest(svc, 'Seat Owner R');
  const s1 = await start(owner, 'seat.r@ucsd.edu');
  const l1 = linkOf(resend.calls[0]);
  assert.equal((await redeem({ lid: l1.lid, t: l1.t, code: s1.data.code })).status, 200);
  const g = await newGuest(svc, 'Seat Guest R');
  const c = await connect(svc, g.token);
  c.send({ t: 'create', settings: { blinds: '10/20', seats: 2 } });
  await c.waitFor((m) => m.t === 'created');
  c.send({ t: 'sit', seat: 1, buyIn: 1000 });
  await c.waitFor((m) => m.t === 'state' && m.me.seat === 1);
  const s2 = await start(g, 'seat.r@ucsd.edu');
  const l2 = linkOf(resend.calls[1]);
  const x = await redeem({ lid: l2.lid, t: l2.t, code: s2.data.code });
  assert.deepEqual([x.status, x.data.error], [409, 'at_table']);
  c.send({ t: 'stand' });
  await c.waitFor((m) => m.t === 'state' && m.me.seat === null);
  assert.equal((await redeem({ lid: l2.lid, t: l2.t, code: s2.data.code })).status, 200);
  assert.equal((await c.waitClose()).code, 4001);
});

test('limits: 5 links an hour per network (as before), 3 an hour per address from one network (more: email-limits)', async () => {
  resend.reset();
  // per network: the sixth start from one address in an hour is refused before anything is sent
  const ip = randomIp();
  for (let k = 0; k < 5; k++) {
    const g = await newGuest(svc, `Net${k}`);
    assert.equal((await start(g, `net${k}@ucsd.edu`, { ip })).status, 200);
  }
  const g6 = await newGuest(svc, 'Net6');
  const over = await start(g6, 'net6@ucsd.edu', { ip });
  assert.deepEqual([over.status, over.data.error], [429, 'rate_limited']);
  assert.equal(resend.calls.length, 5);
  // per address (case and spaces do not matter) from one network: 3 an hour, whichever accounts ask
  resend.reset();
  const net = randomIp();
  const addr = (k) => (k % 2 ? ' Busy@ucsd.edu' : 'busy@UCSD.edu');
  for (let k = 0; k < MAIL_PER_ADDRESS_HOUR; k++) {
    const g = await newGuest(svc, `Busy${k}`);
    assert.equal((await start(g, addr(k), { ip: net })).status, 200);
  }
  const busy = await newGuest(svc, 'Busy3');
  const r = await start(busy, 'busy@ucsd.edu', { ip: net });
  assert.deepEqual([r.status, r.data.error], [429, 'rate_limited']);
  assert.ok(Number(r.headers.get('retry-after')) > 3000 && Number(r.headers.get('retry-after')) <= 3600);
  assert.equal(resend.calls.length, MAIL_PER_ADDRESS_HOUR);
  // another address from that network is not affected
  assert.equal((await start(busy, 'calm@ucsd.edu', { ip: net })).status, 200);
  // the refusals are counted per limit in /v1/health, without naming a network or an address
  const h = await api(svc, 'GET', '/v1/health');
  assert.ok(h.data.limited.email >= 1 && h.data.limited.email_address >= 1, JSON.stringify(h.data.limited));
});

test('the daily cap (EMAIL_DAILY_CAP) holds for everything sent in 24 hours, also across a restart', async () => {
  const fake = fakeResend();
  const dir = tmpDir();
  const c = { offset: 0 };
  const opts = { now: () => Date.now() + c.offset, mailFetch: fake.fetch };
  const env = { ...ENV, EMAIL_DAILY_CAP: '2', DATA_DIR: dir };
  let s = await startTest(env, opts);
  try {
    const a = await newGuest(s, 'CapA');
    assert.equal((await start(a, 'cap.a@ucsd.edu', { on: s })).status, 200);
    const b = await newGuest(s, 'CapB');
    assert.equal((await start(b, 'cap.b@ucsd.edu', { on: s })).status, 200);
    const d = await newGuest(s, 'CapC');
    const third = await start(d, 'cap.c@ucsd.edu', { on: s });
    assert.deepEqual([third.status, third.data.error], [429, 'rate_limited']);
    assert.equal(fake.calls.length, 2);
    await s.stop();
    s = await startTest(env, opts);
    const again = await start(d, 'cap.c@ucsd.edu', { on: s });
    assert.deepEqual([again.status, again.data.error], [429, 'rate_limited'], 'a restart does not reset the cap');
    assert.equal((await api(s, 'GET', '/v1/health')).data.limited.email_daily_cap, 1);
    c.offset += DAY + 1000;
    assert.equal((await start(d, 'cap.c@ucsd.edu', { on: s })).status, 200, '24 hours later');
    assert.equal(fake.calls.length, 3);
    // what is kept for the limits: times and address hashes, never an address
    s.store.flush();
    const text = fs.readFileSync(path.join(dir, 'accounts.json'), 'utf8');
    assert.ok(!/cap\.[abc]@/i.test(text));
    assert.equal(JSON.parse(text).data.mail.sent.length, 1, 'only the last 24 hours are kept');
  } finally {
    await s.stop();
  }
});

test('Resend refuses or fails: clear codes, the link is dropped, a refused email does not count, one retry with the same key', async () => {
  resend.reset();
  const before = svc.accounts.mail.sent.length;
  // 429 from Resend: rate_limited with its Retry-After; nothing counted; the page's link is gone
  resend.plan.push({ status: 429, headers: { 'retry-after': '42' }, body: { statusCode: 429, name: 'rate_limit_exceeded', message: 'Too many requests for x@ucsd.edu' } });
  const g = await newGuest(svc, 'Err');
  const a = await start(g, 'err@ucsd.edu');
  assert.deepEqual([a.status, a.data.error, a.headers.get('retry-after')], [429, 'rate_limited', '42']);
  assert.equal(resend.calls.length, 1, 'no retry after a 429');
  assert.equal(svc.accounts.mail.sent.length, before);
  // a validation error (4xx): send_failed, no retry, not counted
  resend.reset();
  resend.plan.push({ status: 422, body: { statusCode: 422, name: 'validation_error', message: 'Invalid `to` field: err@ucsd.edu' } });
  const b = await start(g, 'err@ucsd.edu');
  assert.deepEqual([b.status, b.data.error], [502, 'send_failed']);
  assert.equal(resend.calls.length, 1);
  assert.equal(svc.accounts.mail.sent.length, before);
  // a 500, then success: one retry with the same Idempotency-Key, so at most one email
  resend.reset();
  resend.plan.push({ status: 500 });
  const c = await start(g, 'err@ucsd.edu');
  assert.equal(c.status, 200);
  assert.equal(resend.calls.length, 2);
  assert.equal(resend.calls[0].headers['idempotency-key'], resend.calls[1].headers['idempotency-key']);
  assert.deepEqual(resend.calls[0].body, resend.calls[1].body);
  assert.equal(svc.accounts.mail.sent.length, before + 1);
  // the network fails twice: send_failed; the email may have gone out, so it counts
  resend.reset();
  resend.plan.push({ throw: true }, { throw: true });
  const d = await start(g, 'err@ucsd.edu');
  assert.deepEqual([d.status, d.data.error], [502, 'send_failed']);
  assert.equal(resend.calls.length, 2);
  assert.equal(svc.accounts.mail.sent.length, before + 2);
  // a failed link cannot be redeemed or polled
  const failedLid = resend.calls[0].headers['idempotency-key'].replace('picasso-signin-', '');
  assert.equal((await redeem({ lid: failedLid, t: linkOf(resend.calls[0]).t, code: '0000' })).data.error, 'expired');
  // distinct links never share a key
  const keys = new Set();
  resend.reset();
  for (let k = 0; k < 2; k++) { const h = await newGuest(svc, `Key${k}`); await start(h, `key${k}@ucsd.edu`); }
  for (const x of resend.calls) keys.add(x.headers['idempotency-key']);
  assert.equal(keys.size, 2);
  // the failures were logged with Resend's status and error name only
  const failed = lines.filter((l) => l.includes('sign-in email not sent'));
  assert.ok(failed.some((l) => l.includes('validation_error')) && failed.some((l) => l.includes('rate_limit_exceeded')));
});

test('neither the plaintext address nor the key is logged, stored or put in a config dump', async () => {
  svc.store.flush();
  const data = fs.readFileSync(`${svc.config.dataDir}/accounts.json`, 'utf8');
  const all = lines.join('\n');
  for (const text of [data, all]) {
    assert.ok(!text.includes(KEY), 'no key');
    assert.ok(!/[A-Za-z0-9.]+@ucsd\.edu/i.test(text.replace(/[a-z]\*\*\*@ucsd\.edu/g, '')), 'no address but masked ones');
    assert.ok(!/account-link\.html\?lid=/.test(text), 'no link');
  }
  assert.ok(!JSON.stringify(svc.config).includes(KEY));
  assert.ok(!util.inspect(svc.config).includes(KEY));
  assert.equal(svc.config.resendApiKey, KEY);
});

test('config: the resend sender needs a readable key file; values are checked; the key never shows in a message', () => {
  const base = { EMAIL_SENDER: 'resend' };
  const fails = (env, re) => assert.throws(() => loadConfig(env), (e) => e instanceof ConfigError && re.test(e.message) && !e.message.includes(KEY));
  fails(base, /needs RESEND_API_KEY_FILE/);
  fails({ ...base, RESEND_API_KEY_FILE: '/nonexistent/resend_api_key' }, /cannot read \/nonexistent\/resend_api_key \(ENOENT\)/);
  const empty = path.join(tmpDir('resend-empty-'), 'k');
  fs.writeFileSync(empty, '\n');
  fails({ ...base, RESEND_API_KEY_FILE: empty }, /is empty/);
  const wrong = path.join(tmpDir('resend-wrong-'), 'k');
  fs.writeFileSync(wrong, 'sk_live_not_a_resend_key_1234567890');
  assert.throws(() => loadConfig({ ...base, RESEND_API_KEY_FILE: wrong }), (e) => /does not look like a Resend API key/.test(e.message) && !e.message.includes('sk_live_not'));
  fails({ ...base, RESEND_API_KEY_FILE: keyFile, RESEND_API_KEY: KEY }, /RESEND_API_KEY is not read/);
  fails({ EMAIL_SENDER: 'smtp' }, /EMAIL_SENDER must be/);
  fails({ EMAIL_FROM: 'Picasso Lab <noreply@picasso-lab.com>\r\nBcc: x@y.z' }, /EMAIL_FROM/);
  fails({ EMAIL_FROM: 'not an address' }, /EMAIL_FROM/);
  fails({ EMAIL_DAILY_CAP: '0' }, /EMAIL_DAILY_CAP/);
  fails({ EMAIL_DAILY_CAP: '2.5' }, /EMAIL_DAILY_CAP/);
  fails({ EMAIL_MONTHLY_CAP: '0' }, /EMAIL_MONTHLY_CAP/);
  fails({ EMAIL_MONTHLY_CAP: 'lots' }, /EMAIL_MONTHLY_CAP/);
  fails({ RESEND_API_URL: 'http://127.0.0.1:9/' }, /needs HOLDEM_TEST_HOOKS=1/);
  fails({ HOLDEM_TEST_HOOKS: '1', RESEND_API_URL: 'https://api.example.com' }, /loopback/);
  const c = loadConfig({ ...base, RESEND_API_KEY_FILE: keyFile, EMAIL_FROM: 'Lab Games <games@picasso-lab.com>', EMAIL_DAILY_CAP: '40' });
  assert.equal(c.emailSender, 'resend');
  assert.equal(c.emailFrom, 'Lab Games <games@picasso-lab.com>');
  assert.equal(c.emailFromAddress, 'games@picasso-lab.com');
  assert.equal(c.emailDailyCap, 40);
  assert.equal(c.resendApiKey, KEY);
  assert.ok(!Object.keys(c).includes('resendApiKey'));
  const d = loadConfig({ RESEND_API_KEY_FILE: '/nonexistent' });
  assert.equal(d.emailSender, 'firebase', 'the default; the key file is not read');
  assert.equal(d.emailFrom, 'Picasso Lab <noreply@picasso-lab.com>');
  assert.equal(d.emailDailyCap, 90);
  assert.equal(d.emailMonthlyCap, 1500);
  assert.equal(d.resendApiKey, null);
  // production accepts the resend sender with a key file
  const p = loadConfig({ NODE_ENV: 'production', GAMES_SECRET: 'a'.repeat(40), IP_SALT: 'b'.repeat(40), TRUST_PROXY: 'fras-caddy-1', ...base, RESEND_API_KEY_FILE: keyFile });
  assert.equal(p.emailSender, 'resend');
});

test('mailer: a timeout or network error is retried once and reported as not definite; 4xx is final', async () => {
  let n = 0;
  const hang = (url, init) => { n++; return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))); };
  const m = createResendMailer({ apiKey: KEY, from: 'Picasso Lab <noreply@picasso-lab.com>', fetch: hang, timeoutMs: 30, retryMs: 1 });
  const mail = { to: 'x@ucsd.edu', subject: 's', text: 't', html: '<p>h</p>', idempotencyKey: 'k1' };
  await assert.rejects(m.send(mail), (e) => e instanceof MailError && e.code === 'send_failed' && e.definite === false && e.provider === 'timeout');
  assert.equal(n, 2);
  let k = 0;
  const four = async () => { k++; return new Response('{"statusCode":403,"name":"invalid_api_key","message":"API key is invalid"}', { status: 403 }); };
  const m2 = createResendMailer({ apiKey: KEY, from: 'a@b.cd', fetch: four, retryMs: 1 });
  await assert.rejects(m2.send(mail), (e) => e.code === 'send_failed' && e.definite === true && e.status === 403 && e.provider === 'invalid_api_key');
  assert.equal(k, 1);
  const ok = async () => new Response('{"id":"abc"}', { status: 200 });
  assert.deepEqual(await createResendMailer({ apiKey: KEY, from: 'a@b.cd', fetch: ok }).send(mail), { id: 'abc' });
  const url = linkUrl('L1', 'T'.repeat(43), 'en');
  assert.equal(url, `${LINK_PAGE}?lid=L1&t=${'T'.repeat(43)}&lang=en`);
  assert.equal(signInEmail({ url, lang: 'en' }).subject, SUBJECT);
});

test('addresses the service would not hand to Resend are refused before anything is sent', async () => {
  resend.reset();
  const g = await newGuest(svc, 'Odd2');
  for (const email of ['a,b@ucsd.edu', 'a<b>@ucsd.edu', '"a b"@ucsd.edu', 'a@ucsd', 'a@ucsd.edu\nBcc: c@d.ef']) {
    const r = await start(g, email);
    assert.deepEqual([r.status, r.data.error], [400, 'bad_email'], email);
  }
  assert.equal(resend.calls.length, 0);
});
