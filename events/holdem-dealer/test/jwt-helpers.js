// Locally signed Firebase-style ID tokens for tests (not a test file): an RSA key pair per signer, its public JWK
// for the injected key fetcher, and the claims Firebase puts in an email-link sign-in token.
import crypto from 'node:crypto';

export const PROJECT = 'yichen-5e23e';

// Firebase uids are opaque; derive a stable fake one
export const uidOf = (email) => crypto.createHash('sha256').update(String(email)).digest('base64url').slice(0, 28);

export function makeSigner(kid = 'test-key-1') {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' };
  return {
    kid,
    jwk,
    sign(claims, header = {}) {
      const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT', ...header })).toString('base64url');
      const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
      const sig = crypto.sign('RSA-SHA256', Buffer.from(`${h}.${p}`), privateKey).toString('base64url');
      return `${h}.${p}.${sig}`;
    },
  };
}

export function idClaims(email, over = {}, nowMs = Date.now()) {
  const t = Math.floor(nowMs / 1000);
  return {
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    auth_time: t - 5,
    user_id: uidOf(email),
    sub: uidOf(email),
    iat: t - 5,
    exp: t + 3600,
    email,
    email_verified: true,
    firebase: { identities: { email: [email] }, sign_in_provider: 'emailLink' },
    ...over,
  };
}
