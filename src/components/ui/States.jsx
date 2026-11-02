import { Icon } from './Icon';
import { Text } from '@/components/ui/Typography';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
export function LoadingState({
  label = 'Loading…'
}) {
  return <View style={styles.wrap}><ActivityIndicator color={colors.primary} /><Text style={styles.body}>{label}</Text></View>;
}
export function EmptyState({
  icon = '🧭',
  title,
  message,
  actionLabel,
  onAction
}) {
  return <View style={styles.wrap}><Icon name={icon} size={36} /><Text style={styles.title}>{title}</Text><Text style={styles.body}>{message}</Text>{actionLabel && onAction ? <Pressable onPress={onAction}><Text style={styles.action}>{actionLabel}</Text></Pressable> : null}</View>;
}
export function ErrorState({
  message,
  onRetry
}) {
  return <View style={styles.wrap}><Text style={styles.icon}>⚠️</Text><Text style={styles.title}>Something went off course</Text><Text style={styles.body}>{message}</Text>{onRetry ? <Pressable onPress={onRetry}><Text style={styles.action}>Try again</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10
  },
  icon: {
    fontSize: 34
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center'
  },
  body: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20
  },
  action: {
    color: colors.primary,
    fontWeight: '800',
    padding: 8
  }
});