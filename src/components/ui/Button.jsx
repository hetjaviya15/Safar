import { Icon } from './Icon';
import { Text } from '@/components/ui/Typography';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '@/constants/theme';
export function Button({
  label,
  variant = 'primary',
  loading,
  icon,
  disabled,
  style,
  ...props
}) {
  const foreground = variant === 'accent' ? colors.onAccent : variant === 'primary' || variant === 'danger' ? colors.surface : colors.primary;
  return <Pressable accessibilityRole="button" disabled={disabled || loading} style={state => [styles.base, styles[variant], (disabled || loading) && styles.disabled, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]} {...props}>
    {loading ? <ActivityIndicator color={foreground} /> : <>{icon ? <Icon name={icon} size={20} color={foreground} /> : null}<Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text></>}
  </Pressable>;
}
const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent'
  },
  label: {
    fontSize: 15,
    fontWeight: '800'
  },
  primaryLabel: {
    color: colors.surface
  },
  secondaryLabel: {
    color: colors.primary
  },
  dangerLabel: {
    color: colors.surface
  },
  ghostLabel: {
    color: colors.primary
  },
  accent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  accentLabel: {
    color: colors.onAccent
  },
  disabled: {
    opacity: 0.48
  },
  pressed: {
    opacity: 0.78
  }
});