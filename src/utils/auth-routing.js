export const EMAIL_CONFIRM_REDIRECT = 'safarapp://email-confirmed';

// A bare callback is not evidence of an email confirmation. Success requires
// both a real confirmation response and a server-validated confirmed user.
export function isVerifiedConfirmationCallback(link, serverConfirmed) {
  return link.kind !== 'empty' && serverConfirmed;
}
export function parseRecoveryLink(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const isCustomScheme = parsed.protocol === 'safar:' || parsed.protocol === 'safarapp:';
    const path = isCustomScheme ? parsed.hostname + parsed.pathname : parsed.pathname.replace(/^\/--\//, '/');
    if (path.replace(/^\/+|\/+$/g, '') !== 'reset-password') return null;
    const hash = new URLSearchParams(parsed.hash.slice(1));
    const param = name => hash.get(name) ?? parsed.searchParams.get(name);
    if (param('error') || param('error_code')) return null;
    const type = param('type');
    if (type && type !== 'recovery') return null;
    const accessToken = param('access_token');
    const refreshToken = param('refresh_token');
    if (accessToken && refreshToken) return {
      kind: 'tokens',
      accessToken,
      refreshToken
    };
    const code = param('code');
    return code ? {
      kind: 'code',
      code
    } : null;
  } catch {
    return null;
  }
}
export function parseEmailConfirmationLink(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const isCustomScheme = parsed.protocol === 'safar:' || parsed.protocol === 'safarapp:';
    const path = isCustomScheme ? parsed.hostname + parsed.pathname : parsed.pathname.replace(/^\/--\//, '/');
    if (path.replace(/^\/+|\/+$/g, '') !== 'email-confirmed') return null;
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const param = name => hash.get(name) ?? parsed.searchParams.get(name);
    const error = param('error') || param('error_code') || param('error_description');
    if (error) {
      const code = param('error_code') ?? 'verification_failed';
      const rawDesc = param('error_description') ?? param('error') ?? 'Verification link is invalid or has expired.';
      return {
        kind: 'error',
        errorCode: code,
        errorDescription: decodeURIComponent(rawDesc.replace(/\+/g, ' '))
      };
    }
    const accessToken = param('access_token');
    const refreshToken = param('refresh_token');
    if (accessToken && refreshToken) {
      return {
        kind: 'tokens',
        accessToken,
        refreshToken,
        type: param('type') ?? 'signup'
      };
    }
    const code = param('code');
    if (code) return {
      kind: 'code',
      code
    };
    const tokenHash = param('token_hash');
    if (tokenHash) {
      const type = param('type') ?? 'signup';
      return {
        kind: 'token_hash',
        tokenHash,
        type
      };
    }
    const email = param('email');
    return email ? {
      kind: 'empty',
      email
    } : {
      kind: 'empty'
    };
  } catch {
    return null;
  }
}
export function authRouteAccess(isVerified, onboardingComplete, recovering) {
  return {
    recovery: recovering,
    home: isVerified && !recovering,
    auth: !isVerified && onboardingComplete && !recovering,
    onboarding: !isVerified && !onboardingComplete && !recovering
  };
}