import { TravelPhoto } from '@/components/TravelPhoto';
import { BrandLogo } from '@/components/BrandLogo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Typography';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafarButton } from '@/components/ui/SafarUI';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/auth';
export default function OnboardingScreen() {
  const {
    completeOnboarding
  } = useAuth();
  async function continueTo(mode) {
    await completeOnboarding();
    router.replace({
      pathname: '/auth',
      params: {
        mode
      }
    });
  }
  return <TravelPhoto photoId="bali" style={styles.root}>
    <StatusBar style="light" />
    <View style={styles.overlay} />
    <SafeAreaView style={styles.safe}>
      <BrandLogo light size={64} />
      <View style={styles.copy}>
        <View style={styles.pill}><Text style={styles.pillText}>PLAN · SHARE · EXPLORE</Text></View>
        <Text style={styles.title}>Explore more.{`\n`}Plan less.</Text>
        <Text style={styles.body}>Build every journey your way—with thoughtful tools, shared plans, and optional AI when you want a little inspiration.</Text>
        <SafarButton label="Get started" icon="→" tone="accent" onPress={() => continueTo('signup')} style={styles.primary} />
        <Pressable accessibilityRole="button" onPress={() => continueTo('signin')} style={styles.signIn}><Text style={styles.signInText}>Already exploring with Safar? <Text style={styles.signInStrong}>Sign in</Text></Text></Pressable>
      </View>
    </SafeAreaView>
  </TravelPhoto>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.heroOverlay
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 22
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFFEE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoIcon: {
    color: colors.primary,
    fontSize: 20
  },
  wordmark: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3
  },
  tagline: {
    color: colors.onHeroMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 2
  },
  copy: {
    gap: 15,
    backgroundColor: colors.heroPanel,
    borderRadius: radius.xl,
    paddingTop: 10
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.17)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill
  },
  pillText: {
    color: colors.onHero,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5
  },
  title: {
    color: '#fff',
    fontSize: 48,
    lineHeight: 51,
    fontWeight: '900',
    letterSpacing: -1.5
  },
  body: {
    color: colors.onHero,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 355,
    marginBottom: 5
  },
  primary: {
    backgroundColor: colors.accent
  },
  signIn: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  signInText: {
    color: colors.onHeroMuted,
    fontSize: 13
  },
  signInStrong: {
    color: '#fff',
    fontWeight: '900'
  }
});