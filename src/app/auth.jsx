import { useAuth } from '@/context/auth';
import { TravelPhoto } from '@/components/TravelPhoto';
import { defaultCurrency } from '@/utils/locale';
import { Icon } from '@/components/ui/Icon';
import { useDialog } from '@/components/ui/CustomModal';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { colors, radius, shadow } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { messageFromError } from '@/utils/errors';
import { EMAIL_CONFIRM_REDIRECT } from '@/utils/auth-routing';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const confirmationRedirect = email => `${EMAIL_CONFIRM_REDIRECT}?email=${encodeURIComponent(email)}`;
export default function AuthScreen() {
  const Alert = useDialog();
  const {
    authNotice
  } = useAuth();
  const params = useLocalSearchParams();
  const [mode, setMode] = useState(params.mode === 'signup' ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [accepted, setAccepted] = useState(false);
  async function openLegal(title, url) {
    if (!url || !/^https:\/\//.test(url)) {
      Alert.alert(title, 'Safar is currently a development preview. Published legal policies are not configured yet. Contact the app owner before sharing personal travel information.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open page', 'Please try again when you are connected.');
    }
  }
  useEffect(() => {
    if (params.email) setEmail(params.email);
    if (params.mode === 'signin' || params.mode === 'signup') setMode(params.mode);
  }, [params.email, params.mode]);
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds(v => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);
  const normalizedEmail = email.trim().toLowerCase();
  function changeMode(next) {
    setPassword('');
    setConfirm('');
    setMode(next);
  }
  async function signUp() {
    if (!accepted || !name.trim() || !emailPattern.test(normalizedEmail) || password.length < 8 || password !== confirm) {
      Alert.alert('Check your details', 'Enter your name, a valid email, and matching passwords of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            preferred_currency: defaultCurrency(),
            preferred_language: 'en'
          },
          emailRedirectTo: confirmationRedirect(normalizedEmail)
        }
      });
      if (error) throw error;
      if (data.session) {
        // A session means email confirmation is turned off in the Supabase dashboard.
        // Sign the user out and warn the developer so this is never accidentally shipped.
        await supabase.auth.signOut({
          scope: 'local'
        });
        if (__DEV__) console.warn('[Safar Auth] signUp returned a session — email confirmation is disabled in Supabase dashboard. Enable it before shipping.');
        Alert.alert('Configuration issue', 'Email confirmation must be enabled in Supabase Authentication settings before accepting new accounts.');
      }
      setPassword('');
      setConfirm('');
      setMode('verify');
      setResendSeconds(60);
    } catch (error) {
      if (__DEV__) console.log('[Safar Auth] signUp error:', messageFromError(error));
      Alert.alert('Sign up failed', messageFromError(error));
    } finally {
      setBusy(false);
    }
  }
  async function signIn() {
    if (!emailPattern.test(normalizedEmail) || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const {
        error: signInError
      } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      if (signInError) {
        // Supabase returns a specific message for unconfirmed accounts.
        // Do not log the password; only log the error code for debugging.
        if (__DEV__) console.log('[Safar Auth] signInWithPassword error:', signInError.status, signInError.name);
        const msg = signInError.message ?? '';
        if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('email_not_confirmed')) {
          // Check whether Supabase already confirmed the account — the local
          // SDK state may not yet reflect a confirmation done on another device.
          const {
            data: check
          } = await supabase.auth.getUser();
          if (check?.user?.email_confirmed_at) {
            // Account IS confirmed — sign-in actually succeeded; the error was
            // misleading. Auth state change will navigate to home.
            if (__DEV__) console.log('[Safar Auth] getUser confirms email is verified — treating sign-in as success');
            return;
          }
          setMode('verify');
          return;
        }
        throw signInError;
      }
      // signInWithPassword succeeded. Validate confirmation server-side via getUser().
      // DO NOT rely on data.user.email_confirmed_at from the sign-in response:
      // Supabase JS SDK v2 omits that field in the signIn response payload.
      const {
        data: verified,
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !verified?.user) {
        if (__DEV__) console.log('[Safar Auth] getUser after sign-in error:', userError?.name);
        await supabase.auth.signOut({
          scope: 'local'
        });
        Alert.alert('Sign in failed', 'Could not verify your account. Please try again.');
        return;
      }
      if (__DEV__) console.log('[Safar Auth] email_confirmed_at:', verified.user.email_confirmed_at);
      if (!verified.user.email_confirmed_at) {
        // Account exists and password is correct but email is not confirmed.
        await supabase.auth.signOut({
          scope: 'local'
        });
        setMode('verify');
        return;
      }
      // Confirmed user — onAuthStateChange(SIGNED_IN) will update the session
      // in AuthContext and the router guard will navigate to home.
    } catch (error) {
      const message = messageFromError(error);
      if (__DEV__) console.log('[Safar Auth] Unexpected sign-in error:', message);
      Alert.alert('Sign in failed', message);
    } finally {
      setBusy(false);
    }
  }
  async function sendReset() {
    if (!emailPattern.test(normalizedEmail)) {
      Alert.alert('Valid email required', 'Enter the email used for your Safar account.');
      return;
    }
    setBusy(true);
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: Linking.createURL('/reset-password')
      });
      if (error) throw error;
      Alert.alert('Check your email', 'If an account exists, a secure password-reset link is on its way.');
      changeMode('signin');
    } catch (error) {
      Alert.alert('Could not send reset email', messageFromError(error));
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (resendSeconds > 0) return;
    if (!emailPattern.test(normalizedEmail)) {
      Alert.alert('Email required', 'Return to sign up and enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const {
        error
      } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: confirmationRedirect(normalizedEmail)
        }
      });
      if (error) throw error;
      setResendSeconds(60);
      Alert.alert('Verification sent', 'Check your inbox and spam folder.');
    } catch (error) {
      Alert.alert('Could not resend', messageFromError(error));
    } finally {
      setBusy(false);
    }
  }
  async function openEmail() {
    try {
      if (Platform.OS === 'android') await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        category: 'android.intent.category.APP_EMAIL'
      });else Alert.alert('Open your email app', 'Tap the confirmation link, then return to Safar and sign in.');
    } catch {
      Alert.alert('Open your email app', 'Please open your preferred email app manually.');
    }
  }
  const title = mode === 'signup' ? 'Your next chapter starts here.' : mode === 'forgot' ? 'Let’s get you back in.' : mode === 'verify' ? 'You’re almost there.' : 'Good to see you again.';
  const subtitle = mode === 'signup' ? 'One account. A world of journeys to make your own.' : mode === 'forgot' ? 'Enter your email and we’ll send a secure reset link.' : mode === 'verify' ? 'Verify your email to start exploring with Safar.' : 'Your saved journeys and new adventures are waiting.';
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
      <View style={styles.secure}><Icon name="verified" size={14} /><Text style={styles.secureText}>Just you. Your email.</Text></View>
    </View>
    <TravelPhoto photoId="cape-town" style={styles.formHero}>
      <View style={styles.heroCopy}><Text style={styles.kicker}>GO SOMEWHERE THAT STAYS WITH YOU</Text><Text style={styles.heroTitle}>Make room{'\n'}for discovery.</Text><Text style={styles.heroLocation}>Camps Bay · Cape Town, South Africa</Text></View>
    </TravelPhoto>
    <View style={styles.card}>
      {mode === 'signin' || mode === 'signup' ? <View style={styles.tabs}>{['signin', 'signup'].map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{
          selected: mode === tab
        }} disabled={busy} onPress={() => changeMode(tab)} style={[styles.tab, mode === tab && styles.tabActive]}><Text style={[styles.tabText, mode === tab && styles.tabTextActive]}>{tab === 'signin' ? 'Sign in' : 'Create account'}</Text></Pressable>)}</View> : <Pressable disabled={busy} accessibilityRole="button" onPress={() => changeMode('signin')} style={styles.back}><Icon name="back" size={18} /><Text style={styles.backText}>Back to sign in</Text></Pressable>}
      {mode === 'verify' ? <View style={styles.verifyIcon}><Icon name="mail" size={36} /></View> : null}
      <View style={styles.heading}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
      {mode === 'verify' ? <>
        <Text style={styles.verifyCopy}>We sent a verification link to</Text><Text style={styles.email}>{normalizedEmail}</Text>
        <View style={styles.steps}>{['Open your email inbox', 'Tap the verification link', 'Come back and sign in'].map((step, index) => <View key={step} style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepText}>{index + 1}</Text></View><Text style={styles.stepCopy}>{step}</Text></View>)}</View>
        <Button label="Open email app" icon="mail" onPress={openEmail} />
        <Button label={resendSeconds ? `Resend email (${resendSeconds}s)` : 'Resend verification'} disabled={resendSeconds > 0} variant="secondary" loading={busy} onPress={resend} />
      </> : <>
        {mode === 'signup' ? <Field icon="user" label="Full name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" placeholder="What should we call you?" editable={!busy} /> : null}
        <Field icon="mail" label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="you@example.com" editable={!busy} />
        {mode !== 'forgot' ? <Field icon="lock" label="Password" value={password} onChangeText={setPassword} password autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} hint={mode === 'signup' ? 'Use at least 8 characters.' : undefined} placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'} editable={!busy} /> : null}
        {mode === 'signup' ? <Field icon="lock" label="Confirm password" value={confirm} onChangeText={setConfirm} password autoCapitalize="none" autoComplete="new-password" placeholder="Enter your password again" editable={!busy} /> : null}
        {mode === 'signin' ? <Pressable disabled={busy} onPress={() => changeMode('forgot')} style={styles.forgot}><Text style={styles.link}>Forgot password?</Text></Pressable> : null}
        {mode === 'signup' ? <View style={styles.termsRow}><Pressable disabled={busy} accessibilityRole="checkbox" accessibilityLabel="Agree to Terms and Privacy Policy" accessibilityState={{
            checked: accepted
          }} onPress={() => setAccepted(v => !v)} hitSlop={8} style={[styles.checkbox, accepted && styles.checkboxChecked]}>{accepted ? <Icon name="check" size={16} color={colors.surface} /> : null}</Pressable><Text style={styles.terms}>I agree to Safar’s <Text style={styles.termsLink} onPress={() => openLegal('Terms of use', process.env.EXPO_PUBLIC_TERMS_URL)}>Terms</Text> and <Text style={styles.termsLink} onPress={() => openLegal('Privacy policy', process.env.EXPO_PUBLIC_PRIVACY_URL)}>Privacy Policy</Text>.</Text></View> : null}
        {authNotice && mode === 'signin' ? <Text accessibilityRole="alert" style={styles.notice}>{authNotice}</Text> : null}
        <Button label={mode === 'signup' ? 'Create my account' : mode === 'forgot' ? 'Send reset link' : 'Sign in to Safar'} icon="next" loading={busy} disabled={mode === 'signup' && !accepted} onPress={mode === 'signup' ? signUp : mode === 'forgot' ? sendReset : signIn} />
        <View style={styles.trust}><Icon name="lock" size={13} color={colors.muted} /><Text style={styles.trustText}>Email-only access · Your plans stay private</Text></View>
      </>}
    </View>
    <Text style={styles.footer}>A world of possibilities. A plan that’s yours.</Text>
  </Screen>;
}
const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 42
  },
  brandRow: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18
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
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  secureText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600'
  },
  formHero: {
    width: '100%',
    maxWidth: 600,
    height: 230,
    borderRadius: 28,
    justifyContent: 'flex-end'
  },
  heroCopy: {
    backgroundColor: colors.heroOverlayStrong,
    padding: 19,
    gap: 6
  },
  kicker: {
    color: colors.onHeroMuted,
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: '800'
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.7
  },
  heroLocation: {
    color: colors.onHeroMuted,
    fontSize: 10
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 22,
    gap: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 4,
    marginBottom: 4
  },
  tab: {
    flex: 1,
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11
  },
  tabActive: {
    backgroundColor: colors.primary
  },
  tabText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 13
  },
  tabTextActive: {
    color: '#fff'
  },
  heading: {
    gap: 8
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 31
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 21,
    fontSize: 13
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36
  },
  backText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12
  },
  verifyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  verifyCopy: {
    color: colors.muted,
    lineHeight: 21
  },
  email: {
    color: colors.primary,
    fontWeight: '800',
    backgroundColor: colors.surfaceMuted,
    padding: 13,
    borderRadius: radius.sm
  },
  steps: {
    gap: 14
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepText: {
    color: colors.accentStrong,
    fontWeight: '800'
  },
  stepCopy: {
    flex: 1,
    color: colors.text,
    fontSize: 13
  },
  forgot: {
    alignSelf: 'flex-end',
    minHeight: 30,
    justifyContent: 'center',
    marginTop: -9
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12
  },
  termsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  checkbox: {
    width: 23,
    height: 23,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: colors.primary
  },
  terms: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 18
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '700'
  },
  notice: {
    color: colors.muted,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    lineHeight: 19
  },
  trust: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6
  },
  trustText: {
    color: colors.muted,
    fontSize: 10
  },
  footer: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 22
  }
});