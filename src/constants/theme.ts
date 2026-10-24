import { Platform } from 'react-native';
import { colors } from './palette';
export { colors, chartColors } from './palette';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const shadow = Platform.select({ android: { elevation: 2 }, default: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 } });

// Compatibility exports for the unused starter components retained in the repository.
export const Colors = {
  light: { text: colors.text, background: colors.background, backgroundElement: colors.surfaceMuted, backgroundSelected: colors.border, textSecondary: colors.muted },
  dark: { text: colors.text, background: colors.background, backgroundElement: colors.surfaceMuted, backgroundSelected: colors.border, textSecondary: colors.muted },
} as const;
export type ThemeColor = keyof typeof Colors.light;
export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'system-ui', serif: 'serif', rounded: 'system-ui', mono: 'monospace' },
});
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 72 }) ?? 0;
export const MaxContentWidth = 800;
