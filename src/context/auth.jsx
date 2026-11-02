import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { readValidatedSession } from '@/services/auth-session';
import { parseRecoveryLink } from '@/utils/auth-routing';
const onboardingKey = 'safar.onboarding.complete.v1';
const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  isVerified: false,
  onboardingComplete: false,
  isPasswordRecovery: false,
  authNotice: '',
  completeOnboarding: async () => undefined,
  finishRecovery: () => undefined,
  cancelRecovery: async () => undefined
});
export function AuthProvider({
  children
}) {
  const [session, setSession] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  // Deliberately not persisted: a normal QR launch is never a recovery request.
  const [isPasswordRecovery, setPasswordRecovery] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    let initializing = true;
    let handlingLink = false;
    let checking = false;
    const processedLinks = new Set();
    async function markReturningUser() {
      if (active) setOnboardingComplete(true);
      await AsyncStorage.setItem(onboardingKey, 'true');
    }
    async function recoverFromUrl(url) {
      const link = parseRecoveryLink(url);
      if (!link || !url || processedLinks.has(url)) return false;
      processedLinks.add(url);
      handlingLink = true;
      revision.current++;
      if (active) {
        setLoading(true);
        setPasswordRecovery(false);
      }
      try {
        await markReturningUser();
        const result = link.kind === 'tokens' ? await supabase.auth.setSession({
          access_token: link.accessToken,
          refresh_token: link.refreshToken
        }) : await supabase.auth.exchangeCodeForSession(link.code);
        if (result.error || !result.data.session) throw new Error('Invalid recovery link');
        const validated = await readValidatedSession(supabase.auth);
        if (!validated.session || validated.invalidStoredSession) {
          if (active) setSession(null);
          await supabase.auth.signOut({
            scope: 'local'
          });
          throw new Error('Invalid recovery session');
        }
        if (active) {
          setSession(validated.session);
          setPasswordRecovery(true);
          setAuthNotice('');
        }
        return true;
      } catch {
        if (active) {
          setPasswordRecovery(false);
          setAuthNotice('That password-reset link could not be used. Request a new link from Forgot password.');
        }
        return false;
      } finally {
        handlingLink = false;
        if (active && !initializing) setLoading(false);
      }
    }
    async function validateSession() {
      const version = revision.current;
      const validated = await readValidatedSession(supabase.auth);
      if (!active || version !== revision.current) return;
      if (validated.hadSession || validated.invalidStoredSession) await markReturningUser();
      if (!active || version !== revision.current) return;
      if (validated.invalidStoredSession) {
        setSession(null);
        setPasswordRecovery(false);
        setAuthNotice('Your previous session is no longer valid. Please sign in or create an account.');
        // Clears this device only; does not affect another user's sessions/data.
        await supabase.auth.signOut({
          scope: 'local'
        });
      } else {
        setSession(validated.session);
        if (!validated.session) setPasswordRecovery(false);
      }
    }
    async function initialize() {
      try {
        const stored = await AsyncStorage.getItem(onboardingKey);
        if (active) setOnboardingComplete(stored === 'true');
        const recovered = await recoverFromUrl(await Linking.getInitialURL());
        if (!recovered) await validateSession();
      } catch {
        if (active) {
          setSession(null);
          setPasswordRecovery(false);
        }
      } finally {
        initializing = false;
        if (active) setLoading(false);
      }
    }
    const {
      data
    } = supabase.auth.onAuthStateChange((event, next) => {
      // INITIAL_SESSION is cached, not a server validation. Do not release the
      // startup spinner or let it overwrite the result of getUser().
      if (!active || initializing || handlingLink || event === 'INITIAL_SESSION') return;
      revision.current++;
      if (!next) {
        setSession(null);
        setPasswordRecovery(false);
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        setSession(next);
        setPasswordRecovery(true);
        return;
      }
      if (event === 'SIGNED_IN') {
        // The session inside the SIGNED_IN event does not include email_confirmed_at
        // on session.user in Supabase JS SDK v2. We MUST call getUser() to get the
        // server-validated user object so that isVerified (which reads
        // session.user.email_confirmed_at) evaluates correctly.
        setOnboardingComplete(true);
        setAuthNotice('');
        const ver = revision.current;
        supabase.auth.getUser().then(({
          data: u,
          error: e
        }) => {
          if (!active || ver !== revision.current) return;
          if (e || !u?.user) {
            if (__DEV__) console.log('[Safar Auth] SIGNED_IN getUser error:', e?.name);
            setSession(next); // fallback to raw session
            return;
          }
          if (__DEV__) console.log('[Safar Auth] SIGNED_IN — email_confirmed_at:', u.user.email_confirmed_at);
          setSession({
            ...next,
            user: u.user
          });
        }).catch(() => {
          if (active) setSession(next);
        });
        return;
      }
      setSession(next);
    });
    void initialize();
    const linkSubscription = Linking.addEventListener('url', ({
      url
    }) => {
      void recoverFromUrl(url);
    });
    const appSubscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || initializing || handlingLink || checking) return;
      checking = true;
      // Network errors do not delete a cached session; retry on next foreground.
      void validateSession().catch(() => undefined).finally(() => {
        checking = false;
      });
    });
    return () => {
      active = false;
      linkSubscription.remove();
      appSubscription.remove();
      data.subscription.unsubscribe();
    };
  }, []);
  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(onboardingKey, 'true');
    setOnboardingComplete(true);
  }, []);
  const finishRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);
  const cancelRecovery = useCallback(async () => {
    revision.current++;
    setPasswordRecovery(false);
    setSession(null);
    setOnboardingComplete(true);
    await supabase.auth.signOut({
      scope: 'local'
    });
  }, []);
  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    isVerified: Boolean(session?.user.email_confirmed_at),
    onboardingComplete,
    isPasswordRecovery: Boolean(session) && isPasswordRecovery,
    authNotice,
    completeOnboarding,
    finishRecovery,
    cancelRecovery
  }), [session, loading, onboardingComplete, isPasswordRecovery, authNotice, completeOnboarding, finishRecovery, cancelRecovery]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  return useContext(AuthContext);
}