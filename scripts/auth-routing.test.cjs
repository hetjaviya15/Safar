const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-ts.cjs');
const { parseRecoveryLink, parseEmailConfirmationLink, isVerifiedConfirmationCallback, authRouteAccess } = load('src/utils/auth-routing.js');
const { readValidatedSession } = load('src/services/auth-session.js');
const session = () => ({ access_token: 'test-token', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'test-user', email_confirmed_at: '2026-10-21' } });
function reader(cached, userResult, sessionError = null) {
  return { getSession: async () => ({ data: { session: cached }, error: sessionError }), getUser: async token => { assert.equal(token, cached.access_token); return userResult; } };
}
test('normal QR, bare reset route, invalid and unrelated links never start recovery', () => {
  for (const url of [null, 'bad url', 'exp://192.168.1.2:8081', 'exp://192.168.1.2:8081/--/reset-password', 'safar://reset-password', 'safarapp://reset-password', 'safar://auth?next=reset-password&code=abc', 'safar://reset-password#access_token=only-one', 'safar://reset-password?code=abc&type=signup', 'safar://reset-password?code=abc&error_code=otp_expired']) assert.equal(parseRecoveryLink(url), null);
});
test('actual reset links work for standalone, Expo Go and web; supports code exchange', () => {
  for (const prefix of ['safar://reset-password', 'safarapp://reset-password', 'exp://192.168.1.2:8081/--/reset-password', 'https://safar.example/reset-password']) {
    assert.deepEqual(parseRecoveryLink(prefix + '#access_token=test-access&refresh_token=test-refresh&type=recovery'), { kind: 'tokens', accessToken: 'test-access', refreshToken: 'test-refresh' });
    assert.deepEqual(parseRecoveryLink(prefix + '?code=test-code'), { kind: 'code', code: 'test-code' });
  }
});
test('email confirmation link parsing supports safarapp and safar schemes, tokens, code, token_hash, errors and empty fallbacks', () => {
  for (const bad of [null, '', 'bad url', 'safar://auth', 'safarapp://auth', 'safarapp://reset-password', 'exp://192.168.1.2:8081/--/auth']) {
    assert.equal(parseEmailConfirmationLink(bad), null);
  }
  for (const prefix of ['safarapp://email-confirmed', 'safar://email-confirmed', 'exp://192.168.1.2:8081/--/email-confirmed', 'https://safar.example/email-confirmed']) {
    assert.deepEqual(parseEmailConfirmationLink(prefix), { kind: 'empty' });
    assert.deepEqual(parseEmailConfirmationLink(prefix + '#access_token=jwt-access&refresh_token=jwt-refresh&type=signup'), { kind: 'tokens', accessToken: 'jwt-access', refreshToken: 'jwt-refresh', type: 'signup' });
    assert.deepEqual(parseEmailConfirmationLink(prefix + '?code=pkce-code-123'), { kind: 'code', code: 'pkce-code-123' });
    assert.deepEqual(parseEmailConfirmationLink(prefix + '?token_hash=pk-hash&type=signup'), { kind: 'token_hash', tokenHash: 'pk-hash', type: 'signup' });
    assert.deepEqual(parseEmailConfirmationLink(prefix + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'), { kind: 'error', errorCode: 'otp_expired', errorDescription: 'Email link is invalid or has expired' });
    assert.deepEqual(parseEmailConfirmationLink(prefix + '?error=access_denied&error_code=403&error_description=Token+expired'), { kind: 'error', errorCode: '403', errorDescription: 'Token expired' });
  }
});
test('deleted account and ordinary returning launch select auth, never reset password', () => {
  assert.deepEqual(authRouteAccess(false, true, false), { recovery: false, home: false, auth: true, onboarding: false });
  assert.equal(authRouteAccess(true, true, false).home, true);
  assert.equal(authRouteAccess(false, false, false).onboarding, true);
});
test('a bare callback or an unconfirmed server user can never show verification success', () => {
  const bareCallback = parseEmailConfirmationLink('safarapp://email-confirmed');
  const realCallback = parseEmailConfirmationLink('safarapp://email-confirmed#access_token=server-token&refresh_token=server-refresh&type=signup');
  assert.equal(isVerifiedConfirmationCallback(bareCallback, true), false);
  assert.equal(isVerifiedConfirmationCallback(realCallback, false), false);
  assert.equal(isVerifiedConfirmationCallback(realCallback, true), true);
});
test('recovery is exclusive and completing/cancelling removes the reset route', () => {
  assert.deepEqual(authRouteAccess(true, true, true), { recovery: true, home: false, auth: false, onboarding: false });
  assert.equal(authRouteAccess(true, true, false).recovery, false);
  assert.equal(authRouteAccess(false, true, false).auth, true);
});
test('a deleted server-side account invalidates even an unexpired, confirmed cached session', async () => {
  const result = await readValidatedSession(reader(session(), { data: { user: null }, error: { name: 'AuthApiError', status: 403, code: 'user_not_found' } }));
  assert.equal(result.session, null); assert.equal(result.invalidStoredSession, true); assert.equal(result.hadSession, true);
});
test('server user replaces stale cached verification data', async () => {
  const current = { id: 'test-user', email_confirmed_at: null };
  const result = await readValidatedSession(reader(session(), { data: { user: current }, error: null }));
  assert.deepEqual(result.session.user, current); assert.equal(result.invalidStoredSession, false);
});
test('temporary offline failure preserves a still-valid session, not an expired one', async () => {
  const cached = session(); const offline = { data: { user: null }, error: { name: 'AuthRetryableFetchError' } };
  assert.equal((await readValidatedSession(reader(cached, offline))).session, cached);
  cached.expires_at = 1;
  assert.equal((await readValidatedSession(reader(cached, offline))).session, null);
});
test('missing session and revoked refresh token do not restore the deleted account', async () => {
  const noSession = await readValidatedSession(reader(null, null));
  assert.equal(noSession.session, null); assert.equal(noSession.invalidStoredSession, false);
  const revoked = await readValidatedSession(reader(null, null, { name: 'AuthApiError', code: 'refresh_token_not_found' }));
  assert.equal(revoked.session, null); assert.equal(revoked.invalidStoredSession, true);
});
