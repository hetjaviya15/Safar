export async function readValidatedSession(auth) {
  const {
    data,
    error
  } = await auth.getSession();
  const cached = data.session;
  if (!cached) return {
    session: null,
    invalidStoredSession: Boolean(error),
    hadSession: false
  };
  // A cached JWT can outlive a user deleted in the dashboard. Ask Auth whether
  // the account still exists; local email_confirmed_at alone is insufficient.
  const {
    data: current,
    error: userError
  } = await auth.getUser(cached.access_token);
  if (userError?.name === 'AuthRetryableFetchError' && (cached.expires_at ?? 0) * 1000 > Date.now()) {
    // Preserve the existing offline, read-only cached-trip experience. Network
    // failure is not proof of account deletion. Every write still uses RLS.
    return {
      session: cached,
      invalidStoredSession: false,
      hadSession: true
    };
  }
  if (error || userError || !current.user || current.user.id !== cached.user.id) {
    return {
      session: null,
      invalidStoredSession: true,
      hadSession: true
    };
  }
  return {
    session: {
      ...cached,
      user: current.user
    },
    invalidStoredSession: false,
    hadSession: true
  };
}