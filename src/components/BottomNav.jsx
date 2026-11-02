import { Icon } from '@/components/ui/Icon';
import { router, usePathname } from 'expo-router';
import { Text } from '@/components/ui/Typography';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
const items = [{
  path: '/',
  label: 'Home',
  icon: '⌂'
}, {
  path: '/explore',
  label: 'Explore',
  icon: '⌕'
}, {
  path: '/create-trip',
  label: 'Create',
  icon: '+'
}, {
  path: '/trips',
  label: 'Trips',
  icon: '▣'
}, {
  path: '/profile',
  label: 'Profile',
  icon: '●'
}];
export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return <View style={[styles.nav, {
    paddingBottom: Math.max(insets.bottom, 8)
  }]}>{items.map(item => {
      const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
      return <Pressable key={item.path} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{
        selected: active
      }} onPress={() => item.path === '/create-trip' ? router.push('/create-trip') : router.navigate(item.path)} style={({
        pressed
      }) => [styles.item, pressed && styles.pressed]}><View style={[styles.iconWrap, item.path === '/create-trip' && styles.create, active && item.path !== '/create-trip' && styles.active]}><Icon name={item.icon} size={item.path === '/create-trip' ? 27 : 22} color={item.path === '/create-trip' ? colors.onAccent : active ? colors.primary : colors.muted} /></View><Text style={[styles.label, active && styles.activeText]}>{item.label}</Text></Pressable>;
    })}</View>;
}
const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 9,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -4
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4
  },
  pressed: {
    opacity: 0.72
  },
  iconWrap: {
    height: 32,
    minWidth: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  active: {
    backgroundColor: colors.accentSoft
  },
  create: {
    backgroundColor: colors.accent,
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: -22
  },
  icon: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: '800'
  },
  createIcon: {
    color: colors.surface,
    fontSize: 28
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700'
  },
  activeText: {
    color: colors.primary
  }
});