import { Text } from '@/components/ui/Typography';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
export function BrandLogo({
  size = 48,
  light = false,
  wordmark = true
}) {
  return <View style={s.row}>
    <Image source={require('../../assets/images/safar-logo.png')} resizeMode="contain" accessibilityLabel="Safar logo" style={{
      width: size,
      height: size
    }} />
    {wordmark ? <View><Text style={[s.name, light && {
        color: colors.surface
      }]}>Safar</Text><Text style={[s.tagline, light && {
        color: colors.onHeroMuted
      }]}>Your journey, your way.</Text></View> : null}
  </View>;
}
const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  name: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.8
  },
  tagline: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 1
  }
});