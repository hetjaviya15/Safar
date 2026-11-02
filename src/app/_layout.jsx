import { DialogProvider } from '@/components/ui/CustomModal';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/auth';
import { colors } from '@/constants/theme';
import { authRouteAccess } from '@/utils/auth-routing';
import { useFonts } from 'expo-font';
import { fontFamilies } from '@/constants/typography';
import { TypographyReady } from '@/components/ui/Typography';
function Router() {
  const {
    loading,
    isVerified,
    onboardingComplete,
    isPasswordRecovery
  } = useAuth();
  const access = authRouteAccess(isVerified, onboardingComplete, isPasswordRecovery);
  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  const isUnauthenticated = !isVerified && !isPasswordRecovery;
  return <>
    <StatusBar style="dark" />
    <Stack initialRouteName={isVerified ? 'index' : onboardingComplete ? 'auth' : 'onboarding'} screenOptions={{
      headerShown: false,
      contentStyle: {
        backgroundColor: colors.background
      }
    }}>
      <Stack.Protected guard={isUnauthenticated}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        {/* Keep this callback unavailable to signed-in users. When a protected
            auth screen disappears after SIGNED_IN, Expo Router selects the
            first available route; placing the callback here prevents normal
            password sign-in from falling through to email confirmation. */}
        <Stack.Screen name="email-confirmed" />
      </Stack.Protected>
      <Stack.Protected guard={access.recovery}><Stack.Screen name="reset-password" /></Stack.Protected>
      <Stack.Protected guard={access.home}>
        <Stack.Screen name="index" /><Stack.Screen name="explore" /><Stack.Screen name="create-trip" />
        <Stack.Screen name="trips" /><Stack.Screen name="profile" /><Stack.Screen name="join" /><Stack.Screen name="invite" />
        <Stack.Screen name="trip/[id]" /><Stack.Screen name="destination" /><Stack.Screen name="safar-ai" /><Stack.Screen name="ai-result" /><Stack.Screen name="map" /><Stack.Screen name="export-trip" /><Stack.Screen name="trip-section" />
      </Stack.Protected>
    </Stack>
  </>;
}
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fontFamilies.regular]: require('../../assets/fonts/GoogleSans-Regular.ttf'),
    [fontFamilies.medium]: require('../../assets/fonts/GoogleSans-Medium.ttf'),
    [fontFamilies.bold]: require('../../assets/fonts/GoogleSans-Bold.ttf')
  });
  // A font-loading failure must not prevent signing in or using the app.
  if (!fontsLoaded && !fontError) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return <TypographyReady.Provider value={fontsLoaded}><SafeAreaProvider><AuthProvider><DialogProvider><Router /></DialogProvider></AuthProvider></SafeAreaProvider></TypographyReady.Provider>;
}
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  }
});