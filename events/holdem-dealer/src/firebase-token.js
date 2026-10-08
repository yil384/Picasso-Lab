// Firebase ID token verification with node:crypto only (DESIGN.md section 4.4, step 4). No admin SDK.
// Tokens are RS256 JWTs signed by Google's securetoken service account; its public keys are published as a JWK set
// and cached for as long as the response's Cache-Control max-age says. A token with an unknown key id triggers one
// refetch (key rotation), at most once every 30 s.
//
//   createVerifier({ projectId, jwksUrl, fetchKeys = () => fetchGoogleKeys(jwksUrl), now = Date.now, skewSec = 60,
//                    maxAuthAgeSec = 3600 })
//     -> { verify(idToken) -> Promise<{ uid, email, authTime }> }   rejects with TokenError(code)
//   fetchGoogleKeys(url = JWKS_URL) -> Promise<{ keys: [jwk...], maxAgeSec }>   the production key fetcher (the
//     browser harness points it at a local JWK set: FIREBASE_JWKS_URL, test hooks only)
//   parseMaxAge(cacheControl) -> seconds
//   TokenError (code: malformed | alg | kid | signature | aud | iss | exp | iat | auth_time | sub | email | keys)
//
// Checks: header alg RS256 with a known kid; signature; aud = projectId; iss = https://securetoken.google.com/<id>;
// exp in the future; iat and auth_time not in the future (60 s skew) and auth_time within the last hour (the
// landing page signs in right before it posts the token); sub a non-empty string <= 128; email_verified true and
// an email present.

import crypto from 'node:crypto';

export const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export class TokenError extends Error {
  constructor(code) {
    super(`id token rejected: ${code}`);
    this.name = 'TokenError';
    this.code = code;
  }
}

export function parseMaxAge(cacheControl) {
  const m = /(?:^|[,\s])max-age=(\d+)/i.exec(String(cacheControl || ''));
  return m ? Number(m[1]) : 0;
}

export async function fetchGoogleKeys(url = JWKS_URL) {
  const res = await fetch(url || JWKS_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new TokenError('keys');
  const body = await res.json();
  if (!body || !Array.isArray(body.keys)) throw new TokenError('keys');
  return { keys: body.keys, maxAgeSec: parseMaxAge(res.headers.get('cache-control')) };
}

const b64json = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
const B64URL = /^[A-Za-z0-9_-]+$/;

export function createVerifier({ projectId, jwksUrl = null, fetchKeys = () => fetchGoogleKeys(jwksUrl), now = Date.now, skewSec = 60, maxAuthAgeSec = 3600 }) {
  if (!projectId) throw new Error('projectId required');
  const cache = { keys: new Map(), expires: 0, fetchedAt: -Infinity };
  let inflight = null;

  async function refresh() {
    if (!inflight) {
      inflight = (async () => {
        try {
          const { keys, maxAgeSec } = await fetchKeys();
          const map = new Map();
          for (const jwk of keys || []) {
            if (!jwk || jwk.kty !== 'RSA' || typeof jwk.kid !== 'string') continue;
            if (jwk.alg && jwk.alg !== 'RS256') continue;
            try {
              map.set(jwk.kid, crypto.createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' }));
            } catch (_) { /* skip a malformed key */ }
          }
          cache.keys = map;
          cache.fetchedAt = now();
          // at least a minute, at most a day, whatever the header says
          cache.expires = cache.fetchedAt + Math.min(Math.max(Number(maxAgeSec) || 0, 60), 86400) * 1000;
        } finally {
          inflight = null;
        }
      })();
    }
    return inflight;
  }

  async function keyFor(kid) {
    const t = now();
    if (t >= cache.expires) await refresh();
    else if (!cache.keys.has(kid) && t - cache.fetchedAt >= 30_000) await refresh();
    return cache.keys.get(kid) || null;
  }

  async function verify(idToken) {
    if (typeof idToken !== 'string' || idToken.length > 4096) throw new TokenError('malformed');
    const parts = idToken.split('.');
    if (parts.length !== 3 || !parts.every((p) => B64URL.test(p))) throw new TokenError('malformed');
    let header;
    let claims;
    try {
      header = b64json(parts[0]);
      claims = b64json(parts[1]);
    } catch (_) {
      throw new TokenError('malformed');
    }
    if (!header || header.alg !== 'RS256') throw new TokenError('alg');
    if (typeof header.kid !== 'string' || !header.kid) throw new TokenError('kid');
    let key;
    try {
      key = await keyFor(header.kid);
    } catch (_) {
      throw new TokenError('keys');
    }
    if (!key) throw new TokenError('kid');
    const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
    if (!ok) throw new TokenError('signature');
    if (!claims || typeof claims !== 'object') throw new TokenError('malformed');
    const t = Math.floor(now() / 1000);
    if (claims.aud !== projectId) throw new TokenError('aud');
    if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new TokenError('iss');
    if (typeof claims.exp !== 'number' || claims.exp <= t) throw new TokenError('exp');
    if (typeof claims.iat !== 'number' || claims.iat > t + skewSec || claims.iat > claims.exp) throw new TokenError('iat');
    const authTime = claims.auth_time;
    if (typeof authTime !== 'number' || authTime > t + skewSec || authTime < t - maxAuthAgeSec) throw new TokenError('auth_time');
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) throw new TokenError('sub');
    if (claims.email_verified !== true || typeof claims.email !== 'string' || !claims.email.includes('@')) throw new TokenError('email');
    return { uid: claims.sub, email: claims.email, authTime };
  }

  return { verify, refresh };
}
