// What the service's own emails (EMAIL_SENDER=resend) may cost, and who can use that up, against a fake Resend (the
// mailer's fetch is injected; nothing leaves the machine): per network and per account a day, one inbox counted once
// (case, plus tags, Gmail dots), one network never using up another's budget for an address, a third of the daily
// cap kept for addresses already saved, the monthly cap, the cap logged once; the mailer's whole send inside a time
// budget the page waits for, and a retry that finds the first request still running at Resend; the email in classic
// Outlook (Word engine).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTest, api, newGuest, randomIp, tmpDir, fakeResend } from './service-helpers.js';
import * as mailer from '../src/mailer.js';
import { loadConfig } from '../src/config.js';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const KEY = `re_test_${'q'.repeat(10)}_${Date.now().toString(36)}`;
const keyFile = path.join(tmpDir('resend-key-'), 'resend_api_key');
fs.writeFileSync(keyFile, `${KEY}\n`, { mode: 0o600 });
const ENV = { EMAIL_LINK: 'on', EMAIL_SENDER: 'resend', RESEND_API_KEY_FILE: keyFile };

// a service of its own (own clock, data, fake Resend and log) for each test: the limits are what is tested
async function service(env = {}) {
  const clock = { offset: 0 };
  const resend = fakeResend();
  const lines = [];
  const log = (msg, fields = {}) => lines.push({ msg, ...fields });
  const svc = await startTest({ ...ENV, ...env }, { now: () => Date.now() + clock.offset, mailFetch: resend.fetch, log });
  return { svc, clock, resend, lines };
}

const start = (svc, guest, email, ip = randomIp()) => api(svc, 'POST', '/v1/email/start', {
  token: guest.token, body: { email }, headers: { 'x-forwarded-for': ip },
});
const ok = (r, what) => assert.equal(r.status, 200, `${what}: ${JSON.stringify(r.data)}`);
const refused = (r, what) => assert.deepEqual([r.status, r.data.error], [429, 'rate_limited'], `${what}: ${JSON.stringify(r.data)}`);
const limited = async (svc) => (await api(svc, 'GET', '/v1/health')).data.limited;

test('one network: at most 10 of the service\'s emails a day (5 an hour as before); one account at most 5 a day', async () => {
  const { svc, clock, resend } = await service();
  try {
    const net = randomIp();
    let k = 0;
    for (let h = 0; h < 2; h++) {
      for (let i = 0; i < 5; i++, k++) ok(await start(svc, await newGuest(svc, `N${k}`), `n${k}@ucsd.edu`, net), `send ${k + 1}`);
      clock.offset += HOUR + 1000;
    }
    // the third hour: the hourly limit has room again, the day's 10 from this network are used
    const r = await start(svc, await newGuest(svc, 'N10'), 'n10@ucsd.edu', net);
    refused(r, 'the eleventh from one network in a day');
    assert.ok(Number(r.headers.get('retry-after')) > 20 * 3600, r.headers.get('retry-after'));
    assert.equal(resend.calls.length, 10);
    ok(await start(svc, await newGuest(svc, 'Other'), 'other@ucsd.edu'), 'another network');
    assert.equal((await limited(svc)).email_network, 1);
    clock.offset += DAY;
    ok(await start(svc, await newGuest(svc, 'N11'), 'n11@ucsd.edu', net), 'a day later');
    // one account, a new network and address each time: 5 a day
    resend.reset();
    const g = await newGuest(svc, 'Acct');
    for (let i = 0; i < 5; i++) ok(await start(svc, g, `acct${i}@ucsd.edu`), `account send ${i + 1}`);
    refused(await start(svc, g, 'acct5@ucsd.edu'), 'the sixth for one account in a day');
    assert.equal(resend.calls.length, 5);
    assert.equal((await limited(svc)).email_account, 1);
  } finally {
    await svc.stop();
  }
});

test('one inbox counts once: case, a plus tag, Gmail dots and googlemail.com are the same address for the limits', async () => {
  const { svc, resend } = await service();
  try {
    const net = randomIp();
    const g = () => newGuest(svc, 'Inbox');
    ok(await start(svc, await g(), 'Victim@gmail.com', net), '1');
    ok(await start(svc, await g(), 'v.ictim+1@gmail.com', net), '2');
    ok(await start(svc, await g(), 'victim+2@googlemail.com', net), '3');
    refused(await start(svc, await g(), 'vic.tim+x@GMAIL.com', net), 'the same Gmail inbox a fourth time in an hour');
    const net2 = randomIp();
    ok(await start(svc, await g(), 'ann+a@ucsd.edu', net2), 'tag a');
    ok(await start(svc, await g(), 'Ann+b@UCSD.edu', net2), 'tag b');
    ok(await start(svc, await g(), 'ann@ucsd.edu', net2), 'no tag');
    refused(await start(svc, await g(), 'ann+c@ucsd.edu', net2), 'the same inbox (a plus tag elsewhere)');
    ok(await start(svc, await g(), 'a.nn@ucsd.edu', net2), 'dots only matter at Gmail');
    assert.equal(resend.calls.length, 7);
    // the address sent to and the one a link binds stay exactly what was typed
    assert.deepEqual(resend.calls[1].body.to, ['v.ictim+1@gmail.com']);
    const lid = resend.calls[1].headers['idempotency-key'].replace('picasso-signin-', '');
    assert.equal(svc.accounts.links.get(lid).emailHash, svc.accounts.emailHash('v.ictim+1@gmail.com'));
    assert.notEqual(svc.accounts.emailHash('v.ictim+1@gmail.com'), svc.accounts.emailHash('victim@gmail.com'));
  } finally {
    await svc.stop();
  }
});

test('an address: 3 an hour from each network, so one network cannot lock its owner out; 20 a day from all networks', async () => {
  const { svc, clock, resend } = await service();
  try {
    const attacker = randomIp();
    for (let i = 0; i < 3; i++) ok(await start(svc, await newGuest(svc, `At${i}`), 'target@example.org', attacker), `attacker ${i + 1}`);
    refused(await start(svc, await newGuest(svc, 'At3'), 'target@example.org', attacker), 'the attacker\'s fourth in an hour');
    ok(await start(svc, await newGuest(svc, 'Owner'), 'target@example.org', randomIp()), 'the owner, from another network');
    // all day from one network: its 10 a day stop it before the address's 20
    let sent = 3;
    for (let h = 1; h < 6; h++) {
      clock.offset += HOUR + 1000;
      for (let i = 0; i < 3; i++) {
        const r = await start(svc, await newGuest(svc, `At${h}${i}`), 'target@example.org', attacker);
        if (r.status === 200) sent++;
      }
    }
    assert.equal(sent, 10, 'one network: 10 a day');
    ok(await start(svc, await newGuest(svc, 'Owner2'), 'target@example.org', randomIp()), 'the owner still gets a link');
    // from many networks together: 20 a day for one address, then nothing more until the oldest is a day old
    let total = 12;
    while (total < 20) { ok(await start(svc, await newGuest(svc, `M${total}`), 'TARGET@example.org', randomIp()), `send ${total + 1}`); total++; }
    refused(await start(svc, await newGuest(svc, 'M20'), 'target@example.org', randomIp()), 'the 21st in a day for one address');
    assert.equal(resend.calls.length, 20);
    assert.ok((await limited(svc)).email_address >= 2);
    clock.offset += DAY;
    ok(await start(svc, await newGuest(svc, 'Later'), 'target@example.org', randomIp()), 'a day later');
  } finally {
    await svc.stop();
  }
});

test('a third of EMAIL_DAILY_CAP is kept for addresses already saved; the cap is logged once, without an address', async () => {
  const { svc, resend, lines } = await service({ EMAIL_DAILY_CAP: '3' });
  try {
    // a saved account (one email)
    const owner = await newGuest(svc, 'Saved');
    const s = await start(svc, owner, 'saved@ucsd.edu');
    ok(s, 'save');
    const t = new URL(/https:\/\/\S+/.exec(resend.calls[0].body.text)[0]).searchParams.get('t');
    ok(await api(svc, 'POST', '/v1/email/redeem', { body: { lid: s.data.lid, t, code: s.data.code } }), 'redeem');
    // new addresses: 2 of the 3 (the third is kept)
    ok(await start(svc, await newGuest(svc, 'New1'), 'new1@ucsd.edu'), 'a new address');
    refused(await start(svc, await newGuest(svc, 'New2'), 'new2@ucsd.edu'), 'a new address over cap minus the reserve');
    refused(await start(svc, await newGuest(svc, 'New3'), 'new3@ucsd.edu'), 'again');
    // the saved address signs in on a new device: the kept one
    ok(await start(svc, await newGuest(svc, 'Phone'), 'Saved@ucsd.edu'), 'a returning address');
    refused(await start(svc, await newGuest(svc, 'Phone2'), 'saved@ucsd.edu'), 'the whole cap is used');
    assert.equal(resend.calls.length, 3);
    assert.equal((await limited(svc)).email_daily_cap, 3);
    const caps = lines.filter((l) => l.msg === 'email cap reached');
    assert.deepEqual(caps.map((l) => l.cap), ['daily_new', 'daily'], JSON.stringify(caps));
    assert.ok(!JSON.stringify(lines).includes('@ucsd.edu'));
  } finally {
    await svc.stop();
  }
});

test('EMAIL_MONTHLY_CAP: at most this many in any 30 days, kept across a restart', async () => {
  const dir = tmpDir();
  const clock = { offset: 0 };
  const resend = fakeResend();
  const env = { ...ENV, EMAIL_MONTHLY_CAP: '3', DATA_DIR: dir };
  const opts = { now: () => Date.now() + clock.offset, mailFetch: resend.fetch };
  let svc = await startTest(env, opts);
  try {
    assert.equal(svc.config.emailMonthlyCap, 3);
    for (let d = 0; d < 3; d++) {
      ok(await start(svc, await newGuest(svc, `Mo${d}`), `mo${d}@ucsd.edu`), `day ${d + 1}`);
      clock.offset += DAY + 1000;
    }
    await svc.stop();
    svc = await startTest(env, opts);
    const r = await start(svc, await newGuest(svc, 'Mo3'), 'mo3@ucsd.edu');
    refused(r, 'the fourth in 30 days');
    assert.ok(Number(r.headers.get('retry-after')) > 20 * 24 * 3600, r.headers.get('retry-after'));
    assert.equal((await limited(svc)).email_monthly_cap, 1);
    clock.offset += 28 * DAY;
    ok(await start(svc, await newGuest(svc, 'Mo4'), 'mo4@ucsd.edu'), '30 days after the first');
    assert.equal(resend.calls.length, 4);
    assert.equal(loadConfig({}).emailMonthlyCap, 1500, 'the default');
  } finally {
    await svc.stop();
  }
});

test('the mailer: the whole send, retries included, stays inside its time budget, which the page outwaits', async () => {
  let n = 0;
  const hang = (url, init) => { n++; return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))); };
  const m = mailer.createResendMailer({ apiKey: KEY, from: 'a@b.cd', fetch: hang, timeoutMs: 200, retryMs: 20, budgetMs: 300 });
  const t0 = Date.now();
  await assert.rejects(m.send({ to: 'x@ucsd.edu', subject: 's', text: 't', html: 'h', idempotencyKey: 'k' }), (e) => e.code === 'send_failed' && e.definite === false);
  const ms = Date.now() - t0;
  assert.equal(n, 2);
  assert.ok(ms < 360, `took ${ms} ms for a 300 ms budget`);
  // the defaults: one attempt fits the budget, and the page (games-account.js) waits well past the budget
  assert.ok(Number.isInteger(mailer.SEND_BUDGET_MS) && mailer.SEND_BUDGET_MS <= 10_000, String(mailer.SEND_BUDGET_MS));
  assert.ok(mailer.ATTEMPT_TIMEOUT_MS < mailer.SEND_BUDGET_MS);
  const page = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../static/games-account.js'), 'utf8');
  const wait = Number((/const EMAIL_START_TIMEOUT_MS = (\d+);/.exec(page) || [])[1]);
  assert.ok(wait >= mailer.SEND_BUDGET_MS + 5000, `the page waits ${wait} ms`);
  assert.match(page, /request\("\/email\/start", \{ email, lang \}, \{ timeout: EMAIL_START_TIMEOUT_MS \}\)/);
});

test('the mailer: a retry that finds the first request still running at Resend waits for its result; unknown is never "not sent"', async () => {
  const mail = { to: 'x@ucsd.edu', subject: 's', text: 't', html: 'h', idempotencyKey: 'k2' };
  const inProgress = { status: 409, body: { statusCode: 409, name: 'concurrent_idempotent_requests', message: 'x' } };
  // timed out, then 409 in progress, then Resend's stored answer: sent, once
  let r = fakeResend();
  r.plan.push({ hang: true }, inProgress, { status: 200, body: { id: 'em_first' } });
  let m = mailer.createResendMailer({ apiKey: KEY, from: 'a@b.cd', fetch: r.fetch, timeoutMs: 60, retryMs: 10, budgetMs: 2000 });
  assert.deepEqual(await m.send(mail), { id: 'em_first' });
  assert.equal(r.calls.length, 3);
  assert.ok(r.calls.every((c) => c.headers['idempotency-key'] === 'k2'));
  // still in progress when the budget ends: unknown (the email may go out), not refused
  r = fakeResend();
  r.plan.push({ throw: true }, inProgress, inProgress, inProgress);
  m = mailer.createResendMailer({ apiKey: KEY, from: 'a@b.cd', fetch: r.fetch, retryMs: 10, budgetMs: 2000 });
  await assert.rejects(m.send(mail), (e) => e.code === 'send_failed' && e.definite === false && e.status === 409);
  assert.equal(r.calls.length, 3, 'at most three attempts');
  // a 5xx, then any 4xx on the retry: the first may have been sent, so the outcome stays unknown
  r = fakeResend();
  r.plan.push({ status: 500 }, { status: 422, body: { statusCode: 422, name: 'validation_error', message: 'x' } });
  m = mailer.createResendMailer({ apiKey: KEY, from: 'a@b.cd', fetch: r.fetch, retryMs: 10 });
  await assert.rejects(m.send(mail), (e) => e.status === 422 && e.definite === false);
  r = fakeResend();
  r.plan.push({ throw: true }, { status: 429, headers: { 'retry-after': '5' }, body: { statusCode: 429, name: 'rate_limit_exceeded', message: 'x' } });
  m = mailer.createResendMailer({ apiKey: KEY, from: 'a@b.cd', fetch: r.fetch, retryMs: 10 });
  await assert.rejects(m.send(mail), (e) => e.code === 'rate_limited' && e.definite === false);
  // a 4xx on the first attempt is still final (nothing was sent)
  r = fakeResend();
  r.plan.push({ status: 422, body: { statusCode: 422, name: 'validation_error', message: 'x' } });
  m = mailer.createResendMailer({ apiKey: KEY, from: 'a@b.cd', fetch: r.fetch, retryMs: 10 });
  await assert.rejects(m.send(mail), (e) => e.status === 422 && e.definite === true);
  assert.equal(r.calls.length, 1);
});

test('the service: an email whose fate is unknown (still running at Resend) is counted, not refunded', async () => {
  const { svc, resend, lines } = await service();
  try {
    const inProgress = { status: 409, body: { statusCode: 409, name: 'concurrent_idempotent_requests', message: 'x' } };
    resend.plan.push({ throw: true }, inProgress, inProgress);
    const g = await newGuest(svc, 'Unknown');
    const net = randomIp();
    const r = await start(svc, g, 'unknown@ucsd.edu', net);
    assert.deepEqual([r.status, r.data.error], [502, 'send_failed']);
    assert.equal(resend.calls.length, 3);
    assert.equal(svc.accounts.mail.sent.length, 1, 'counted toward the daily cap');
    const line = lines.find((l) => l.msg === 'sign-in email not sent');
    assert.equal(line.counted, true);
    // and toward the address: two more from this network this hour, then refused
    ok(await start(svc, await newGuest(svc, 'U2'), 'unknown@ucsd.edu', net), 'second');
    ok(await start(svc, await newGuest(svc, 'U3'), 'unknown@ucsd.edu', net), 'third');
    refused(await start(svc, await newGuest(svc, 'U4'), 'unknown@ucsd.edu', net), 'fourth');
  } finally {
    await svc.stop();
  }
});

test('the email in classic Outlook (Word engine): a 520 px ghost table, and the button sized by its cell', () => {
  for (const lang of ['zh', 'en']) {
    const { html } = mailer.signInEmail({ url: mailer.linkUrl('L', 'T'.repeat(43), lang), lang });
    assert.match(html, /<!--\[if mso\]><table role="presentation" width="520" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><!\[endif\]-->/);
    assert.match(html, /<!--\[if mso\]><\/td><\/tr><\/table><!\[endif\]-->/);
    const cell = /<td bgcolor="#34478f" style="([^"]+)">\s*<a [^>]*style="([^"]+)"/.exec(html);
    assert.ok(cell, 'the button cell and its link');
    const pad = /padding:([^;]+);/.exec(cell[2])[1];
    assert.ok(cell[1].includes(`mso-padding-alt:${pad};`), `${cell[1]} | ${pad}`);
    assert.ok(!/<img|<script|<link |url\(|@import|<style/i.test(html));
  }
});
