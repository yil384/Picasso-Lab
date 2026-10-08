// The sign-in email (EMAIL_SENDER=resend, DESIGN.md section 4.4): its text and HTML, and the Resend HTTP API call
// that sends it from EMAIL_FROM. The plaintext address is a parameter of send() only: it is never stored, logged or
// put in an error. The API key comes from config (a file, read once at startup) and is never logged either.
//
//   linkUrl(lid, token, lang) -> the link page URL with ?lid=&t=&lang=
//   signInEmail({ url, lang, minutes }) -> { subject, text, html }   bilingual, Chinese first for lang zh
//   createResendMailer({ apiKey, from, apiUrl, fetch, timeoutMs, retryMs, log })
//     -> { send({ to, subject, text, html, idempotencyKey, headers }) -> Promise<{ id }> }
//     rejects with MailError: code rate_limited (Resend answered 429; retryAfter in s) or send_failed;
//     definite = true when Resend answered (nothing was sent), false when the outcome is unknown (network, timeout)
//   MailError
//
// One retry, with the same Idempotency-Key, after a network error, a timeout or a 5xx: Resend sends a key at most
// once in 24 hours, so a retry never sends a second email.

export const LINK_PAGE = 'https://yil384.github.io/Picasso-Lab/events/account-link.html';
export const RESEND_API = 'https://api.resend.com';
export const SUBJECT = 'Picasso Lab 游戏登录 / Sign in to Picasso Lab games';

export class MailError extends Error {
  constructor(code, { status = 0, name = '', retryAfter = 0, definite = true } = {}) {
    super(`email not sent: ${code}`);
    this.name = 'MailError';
    this.code = code;
    this.status = status;
    this.provider = name;
    this.retryAfter = retryAfter;
    this.definite = definite;
  }
}

export function linkUrl(lid, token, lang) {
  const q = new URLSearchParams({ lid, t: token, lang: lang === 'en' ? 'en' : 'zh' });
  return `${LINK_PAGE}?${q}`;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function copy(minutes) {
  return {
    zh: {
      lead: '点下面的按钮登录 Picasso Lab 游戏（掼蛋、德州扑克），保存你的账号。',
      leadText: '打开下面的链接登录 Picasso Lab 游戏（掼蛋、德州扑克），保存你的账号：',
      button: '登录并保存账号',
      expiry: `链接 ${minutes} 分钟内有效，只能用一次。`,
      raw: '按钮打不开的话，把这个链接复制到浏览器：',
      ignore: '如果不是你本人操作，请忽略这封邮件，什么都不会改变。',
    },
    en: {
      lead: 'Use the button below to sign in to Picasso Lab games (Guandan, Hold\'em) and save your account.',
      leadText: 'Open the link below to sign in to Picasso Lab games (Guandan, Hold\'em) and save your account:',
      button: 'Sign in and save',
      expiry: `The link works once, within ${minutes} minutes.`,
      raw: 'If the button does not work, copy this link into your browser:',
      ignore: 'If you did not ask for this, ignore this email. Nothing will change.',
    },
  };
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";
const NAVY = '#1b2750';
const BLUE = '#34478f';
const INK = '#26314f';
const MUTED = '#5d6782';
const LANG = { zh: 'zh-CN', en: 'en' };

// one paragraph row of the card; size/colour by role
function row(text, lang, { size = 15, color = INK, weight = 400, pad = '0 0 10px 0' } = {}) {
  return `<tr><td lang="${LANG[lang]}" style="padding:${pad};font-family:${FONT};font-size:${size}px;font-weight:${weight};line-height:1.6;color:${color};">${esc(text)}</td></tr>`;
}

// Gmail, Outlook (Word engine) and Apple Mail: tables, inline styles, bgcolor on the button cell, no images, no
// web fonts, light colour scheme, at most 520 px wide and fluid below that
export function signInEmail({ url, lang = 'zh', minutes = 30 }) {
  const c = copy(minutes);
  const [first, second] = lang === 'en' ? ['en', 'zh'] : ['zh', 'en'];
  const a = c[first];
  const b = c[second];
  const text = [
    'Picasso Lab',
    '',
    a.leadText,
    b.leadText,
    '',
    url,
    '',
    `${a.expiry}${first === 'zh' ? '' : ' '}${a.ignore}`,
    `${b.expiry}${second === 'zh' ? '' : ' '}${b.ignore}`,
    '',
    'Picasso Lab, UC San Diego',
  ].join('\n');
  const link = esc(url);
  const html = `<!DOCTYPE html>
<html lang="${LANG[first]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef1f7;font-size:1px;line-height:1px;">${esc(a.expiry)} ${esc(b.expiry)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef1f7" style="background-color:#eef1f7;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
  <tr><td style="padding:0 6px 12px 6px;font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:2px;color:${NAVY};">PICASSO LAB</td></tr>
  <tr><td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #dfe5f0;border-radius:12px;padding:26px 24px 18px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${row(a.lead, first, { size: 17, weight: 600, pad: '0 0 8px 0' })}
    ${row(b.lead, second, { size: 15, color: MUTED, pad: '0 0 20px 0' })}
    <tr><td style="padding:0 0 18px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="${BLUE}" style="background-color:${BLUE};border-radius:8px;">
          <a href="${link}" target="_blank" lang="${LANG[first]}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(a.button)}</a>
        </td>
      </tr></table>
    </td></tr>
    ${row(a.expiry, first, { size: 14, color: MUTED, pad: '0 0 2px 0' })}
    ${row(b.expiry, second, { size: 14, color: MUTED, pad: '0 0 16px 0' })}
    ${row(a.raw, first, { size: 13, color: MUTED, pad: '0 0 0 0' })}
    ${row(b.raw, second, { size: 13, color: MUTED, pad: '0 0 4px 0' })}
    <tr><td style="padding:0 0 18px 0;font-family:${FONT};font-size:13px;line-height:1.5;word-break:break-all;"><a href="${link}" target="_blank" style="color:${BLUE};text-decoration:underline;">${link}</a></td></tr>
    <tr><td style="padding:14px 0 0 0;border-top:1px solid #e3e8f2;font-size:0;line-height:0;">&nbsp;</td></tr>
    ${row(a.ignore, first, { size: 13, color: MUTED, pad: '0 0 2px 0' })}
    ${row(b.ignore, second, { size: 13, color: MUTED, pad: '0 0 0 0' })}
    </table>
  </td></tr>
  <tr><td style="padding:14px 6px 0 6px;font-family:${FONT};font-size:12px;line-height:1.5;color:#7a839b;">Picasso Lab, UC San Diego</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
  return { subject: SUBJECT, text, html };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createResendMailer({ apiKey, from, apiUrl = RESEND_API, fetch: fetchFn = globalThis.fetch, timeoutMs = 10_000, retryMs = 600, log = () => {} }) {
  if (!apiKey) throw new Error('Resend API key required');
  if (!from) throw new Error('sender required');
  const endpoint = `${String(apiUrl || RESEND_API).replace(/\/+$/, '')}/emails`;

  async function attempt(body, idempotencyKey) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
          'user-agent': 'picasso-games/1',
        },
        body,
        signal: ctrl.signal,
      });
      let data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      if (res.ok && data && typeof data.id === 'string') return { id: data.id.slice(0, 80) };
      // Resend's error name (e.g. validation_error) is a fixed code; its message may echo the address: never kept
      const name = data && typeof data.name === 'string' && /^[a-z_]{1,40}$/.test(data.name) ? data.name : '';
      if (res.status === 429) {
        const ra = Number.parseInt(res.headers?.get?.('retry-after') || '', 10);
        throw new MailError('rate_limited', { status: 429, name, retryAfter: Number.isFinite(ra) && ra > 0 ? Math.min(ra, 3600) : 60 });
      }
      throw new MailError('send_failed', { status: res.status || 0, name, definite: res.status < 500 });
    } catch (e) {
      if (e instanceof MailError) throw e;
      throw new MailError('send_failed', { name: e.name === 'AbortError' ? 'timeout' : 'network', definite: false });
    } finally {
      clearTimeout(timer);
    }
  }

  async function send({ to, subject, text, html, idempotencyKey, headers }) {
    const body = JSON.stringify({ from, to: [to], subject, text, html, ...(headers ? { headers } : {}) });
    try {
      return await attempt(body, idempotencyKey);
    } catch (e) {
      if (e.code !== 'send_failed' || (e.status > 0 && e.status < 500)) throw e; // a 4xx: Resend said no
      log('email send retry', { status: e.status, error: e.provider });
      await sleep(retryMs);
      return attempt(body, idempotencyKey);
    }
  }

  return { send };
}
