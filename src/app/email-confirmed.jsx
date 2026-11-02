import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Typography';
import { colors, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { isVerifiedConfirmationCallback, parseEmailConfirmationLink } from '@/utils/auth-routing';
/**
 * Check whether the currently-cached Supabase session belongs to a confirmed
 * user. Supabase's default confirmation flow (ConfirmationURL) verifies the
 * email on the server, then redirects to safarapp://email-confirmed — often
 * with no token in the redirect URL because the token was consumed server-side.
 * When that happens, the app must confirm success by calling getUser() instead
 * of trying to parse a token that no longer exists in the URL.
 */
async function checkCurrentSessionVerified() {
  try {
    const {
      data,
      error
    } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return {
      verified: Boolean(data.user.email_confirmed_at),
      email: data.user.email ?? ''
    };
  } catch {
    return null;
  }
}
export default function EmailConfirmedScreen() {
  const params = useLocalSearchParams();
  const {
    completeOnboarding
  } = useAuth();
  const [state, setState] = useState({
    status: 'verifying'
  });
  const [continuing, setContinuing] = useState(false);
  async function verifyUrl(rawUrl) {
    if (!rawUrl) return;
    const link = parseEmailConfirmationLink(rawUrl);
    if (!link) return;
    if (link.kind === 'error') {
      const isExpired = link.errorCode === 'otp_expired' || /expired|already/i.test(link.errorDescription);
      setState({
        status: 'error',
        message: isExpired ? 'This verification link is invalid or has expired.' : link.errorDescription || 'Could not verify your email address.',
        isExpiredOrUsed: isExpired
      });
      return;
    }
    if (link.kind === 'tokens') {
      try {
        // Validate the access token server-side without creating a local session.
        // getUser(token) never fires onAuthStateChange so AuthContext is unaffected.
        const {
          data,
          error
        } = await supabase.auth.getUser(link.accessToken);
        if (error || !data?.user) {
          setState({
            status: 'error',
            message: 'This verification link is invalid or has expired.',
            isExpiredOrUsed: true
          });
          return;
        }
        if (isVerifiedConfirmationCallback(link, Boolean(data.user.email_confirmed_at))) {
          // Keep the user signed out on the local device as required
          await supabase.auth.signOut({
            scope: 'local'
          });
          setState({
            status: 'success',
            email: data.user.email ?? ''
          });
        } else {
          setState({
            status: 'error',
            message: 'Server has not marked this email as confirmed yet.',
            isExpiredOrUsed: false
          });
        }
      } catch {
        setState({
          status: 'error',
          message: 'Network error while contacting authentication server.',
          isExpiredOrUsed: false
        });
      }
      return;
    }
    if (link.kind === 'code') {
      try {
        // Sign out any local session BEFORE calling exchangeCodeForSession so
        // the SIGNED_IN event does not trigger AuthContext to navigate to Home
        // while this verification screen is still displayed.
        await supabase.auth.signOut({
          scope: 'local'
        });
        const {
          data,
          error
        } = await supabase.auth.exchangeCodeForSession(link.code);
        if (error || !data?.user) {
          setState({
            status: 'error',
            message: 'This verification code is invalid or has expired.',
            isExpiredOrUsed: true
          });
          return;
        }
        const isConfirmed = Boolean(data.user.email_confirmed_at);
        const email = data.user.email ?? '';
        // Sign out locally again — the server session is valid but we require
        // the user to explicitly sign in after verification.
        await supabase.auth.signOut({
          scope: 'local'
        });
        if (isVerifiedConfirmationCallback(link, isConfirmed)) {
          setState({
            status: 'success',
            email
          });
        } else {
          setState({
            status: 'error',
            message: 'Email confirmation could not be verified.',
            isExpiredOrUsed: false
          });
        }
      } catch {
        setState({
          status: 'error',
          message: 'Could not complete verification exchange.',
          isExpiredOrUsed: false
        });
      }
      return;
    }
    if (link.kind === 'token_hash') {
      try {
        // Keep a copy of the server-validated state before clearing the local
        // session. A reused link can fail verifyOtp even though the account was
        // confirmed on the earlier attempt.
        const cached = await checkCurrentSessionVerified();
        // Sign out locally BEFORE calling verifyOtp to prevent the SIGNED_IN
        // event from navigating the user away from this screen prematurely.
        await supabase.auth.signOut({
          scope: 'local'
        });
        const {
          data,
          error
        } = await supabase.auth.verifyOtp({
          token_hash: link.tokenHash,
          type: link.type
        });
        if (error || !data?.user) {
          // If token_hash is rejected but we have a cached session, the user
          // may have already verified. Check server state before showing error.
          if (cached?.verified) {
            setState({
              status: 'already_verified',
              email: cached.email
            });
            return;
          }
          setState({
            status: 'error',
            message: 'This verification token is invalid or has expired.',
            isExpiredOrUsed: true
          });
          return;
        }
        const isConfirmed = Boolean(data.user.email_confirmed_at);
        const email = data.user.email ?? '';
        await supabase.auth.signOut({
          scope: 'local'
        });
        if (isVerifiedConfirmationCallback(link, isConfirmed)) {
          setState({
            status: 'success',
            email
          });
        } else {
          setState({
            status: 'error',
            message: 'Email confirmation could not be verified.',
            isExpiredOrUsed: false
          });
        }
      } catch {
        setState({
          status: 'error',
          message: 'Could not verify token with server.',
          isExpiredOrUsed: false
        });
      }
      return;
    }
    if (link.kind === 'empty') {
      // Supabase's hosted confirmation page consumes the one-time token before
      // redirecting to the app. Carrying the signup email in redirect_to lets
      // this callback identify the account even when the browser has no app
      // session to inspect.
      if (link.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link.email)) {
        setState({
          status: 'success',
          email: link.email
        });
        return;
      }
      // The link opened Safar without any verification parameters.
      // This is the most common case with Supabase's default ConfirmationURL:
      // the server verifies the email and redirects to safarapp://email-confirmed
      // with nothing in the URL because the token was consumed server-side.
      // Check the actual server state by calling getUser().
      try {
        const cached = await checkCurrentSessionVerified();
        if (cached?.verified) {
          // Account is confirmed on the server — sign out local session and show success.
          await supabase.auth.signOut({
            scope: 'local'
          });
          setState({
            status: 'already_verified',
            email: cached.email
          });
          return;
        }
        if (cached && !cached.verified) {
          // There is a session but email is not confirmed yet.
          await supabase.auth.signOut({
            scope: 'local'
          });
          setState({
            status: 'error',
            message: 'Your email is not confirmed yet. Please check your inbox for the verification link.',
            isExpiredOrUsed: false
          });
          return;
        }
      } catch {/* ignore — fall through to generic message */}

      // No session at all — user may have already signed out after verifying elsewhere,
      // or arrived here from an old link while the app was closed.
      setState({
        status: 'error',
        message: 'If you have already confirmed your email, you can sign in directly. Otherwise, request a new verification link.',
        isExpiredOrUsed: false
      });
    }
  }
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    let active = true;
    (async () => {
      // 1. Check if the app was launched with a deep link URL
      const initial = await Linking.getInitialURL();
      if (initial && active) {
        const parsed = parseEmailConfirmationLink(initial);
        if (parsed) {
          await verifyUrl(initial);
          return;
        }
      }

      // 2. Check params passed via Expo Router
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (typeof v === 'string') search.set(k, v);else if (Array.isArray(v) && typeof v[0] === 'string') search.set(k, v[0]);
      }
      const paramStr = search.toString();
      if (active) {
        const paramUrl = paramStr ? `safarapp://email-confirmed?${paramStr}` : 'safarapp://email-confirmed';
        await verifyUrl(paramUrl);
      }
    })();
    const sub = Linking.addEventListener('url', ({
      url
    }) => {
      if (active) void verifyUrl(url);
    });
    return () => {
      active = false;
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);
  async function goToAuth(targetParams) {
    if (continuing) return;
    setContinuing(true);
    try {
      // A successful callback must leave this device signed out so the
      // unauthenticated auth route remains available after the replace.
      await supabase.auth.signOut({
        scope: 'local'
      });
      await completeOnboarding();
    } catch {
      // non-fatal
    }
    if (targetParams) router.replace({
      pathname: '/auth',
      params: targetParams
    });else router.replace('/auth');
    setContinuing(false);
  }
  function handleContinue() {
    if (state.status === 'success' && state.email) {
      void goToAuth({
        mode: 'signin',
        email: state.email
      });
    } else if (state.status === 'already_verified' && state.email) {
      void goToAuth({
        mode: 'signin',
        email: state.email
      });
    } else {
      void goToAuth({
        mode: 'signin'
      });
    }
  }
  return <Screen contentStyle={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.brandRow}>
        <View style={styles.headerBrand}>
          <View style={styles.brandLine}>
            <Text style={styles.plane}>✈</Text>
            <Text style={styles.brand}>Safar</Text>
          </View>
          <Text style={styles.tagline}>Your journey, your way.</Text>
        </View>
        <View style={styles.badge}>
          <Icon name="verified" size={14} color={colors.accentStrong} />
          <Text style={styles.badgeText}>Safar Verification</Text>
        </View>
      </View>

      <View style={styles.card}>
        {state.status === 'verifying' ? <View style={styles.centerSection}>
            <View style={styles.iconWrapPending}>
              <ActivityIndicator size="large" color={colors.accentStrong} />
            </View>
            <Text style={styles.title}>Verifying Your Email…</Text>
            <Text style={styles.subtitle}>
              Confirming your account with Safar secure servers. Please wait a moment.
            </Text>
          </View> : state.status === 'success' ? <View style={styles.centerSection}>
            <View style={styles.iconWrapSuccess}>
              <View style={styles.iconRingSuccess}>
                <Icon name="check" size={38} color={colors.accentStrong} />
              </View>
            </View>
            <Text style={styles.title}>Email Verified Successfully! ✅</Text>
            <Text style={styles.subtitle}>Your Safar account is ready.</Text>
            {state.email ? <View style={styles.emailPill}>
                <Icon name="mail" size={15} color={colors.accentStrong} />
                <Text style={styles.emailText}>{state.email}</Text>
              </View> : null}
            <Text style={styles.infoText}>
              Your email has been confirmed. You can now sign in with your password to begin planning your journeys.
            </Text>
            <Button label="Continue to Sign In" icon="next" onPress={handleContinue} loading={continuing} style={styles.actionButton} />
          </View> : state.status === 'already_verified' ? <View style={styles.centerSection}>
            <View style={styles.iconWrapSuccess}>
              <View style={styles.iconRingSuccess}>
                <Icon name="check" size={38} color={colors.accentStrong} />
              </View>
            </View>
            <Text style={styles.title}>Already Verified ✅</Text>
            <Text style={styles.subtitle}>Your account is confirmed and ready.</Text>
            {state.email ? <View style={styles.emailPill}>
                <Icon name="mail" size={15} color={colors.accentStrong} />
                <Text style={styles.emailText}>{state.email}</Text>
              </View> : null}
            <Text style={styles.infoText}>
              Your Safar account is already verified. You can sign in with your email and password.
            </Text>
            <Button label="Continue to Sign In" icon="next" onPress={handleContinue} loading={continuing} style={styles.actionButton} />
          </View> : <View style={styles.centerSection}>
            <View style={styles.iconWrapError}>
              <View style={styles.iconRingError}>
                <Icon name="close" size={34} color={colors.danger} />
              </View>
            </View>
            <Text style={styles.title}>
              {state.isExpiredOrUsed ? 'Link Expired or Already Used' : 'Verification Unsuccessful'}
            </Text>
            <Text style={styles.errorDescription}>{state.message}</Text>
            {state.isExpiredOrUsed ? <Text style={styles.infoText}>
                If you have already confirmed your email previously, your account is ready and you can sign in directly with your password.
              </Text> : <Text style={styles.infoText}>
                Please make sure you tapped the latest link sent to your email, or request a new confirmation email.
              </Text>}
            <Button label="Return to Sign In" icon="back" onPress={() => void goToAuth({
          mode: 'signin'
        })} style={styles.actionButton} />
            <Button label="Request New Verification Email" variant="secondary" onPress={() => void goToAuth({
          mode: 'signup'
        })} style={styles.secondaryButton} />
          </View>}
      </View>

      <Text style={styles.footer}>Safar · Your journey, your way.</Text>
    </Screen>;
}
const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    backgroundColor: colors.background
  },
  brandRow: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  headerBrand: {
    alignItems: 'flex-start',
    gap: 0
  },
  brandLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  plane: {
    color: colors.primary,
    fontSize: 35,
    lineHeight: 38
  },
  brand: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.6
  },
  tagline: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 18,
    marginTop: -1
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill
  },
  badgeText: {
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: '700'
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow
  },
  centerSection: {
    alignItems: 'center',
    gap: 16
  },
  iconWrapPending: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  iconWrapSuccess: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accentBorder,
    marginBottom: 8
  },
  iconRingSuccess: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconWrapError: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.danger,
    marginBottom: 8
  },
  iconRingError: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30
  },
  subtitle: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accentBorder
  },
  emailText: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '700'
  },
  infoText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 420
  },
  errorDescription: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 420
  },
  actionButton: {
    width: '100%',
    marginTop: 8
  },
  secondaryButton: {
    width: '100%'
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24
  }
});