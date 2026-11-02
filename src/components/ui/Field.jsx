import { Icon } from './Icon';
import { forwardRef, useState } from 'react';
import { Text, TextInput } from '@/components/ui/Typography';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
export const Field = forwardRef(function Field({
  label,
  error,
  hint,
  password,
  icon,
  style,
  onFocus,
  onBlur,
  ...props
}, ref) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return <View style={styles.wrap}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View style={[styles.inputWrap, focused && styles.focused, error && styles.inputError]}>
      {icon ? <View style={{
        marginRight: 10
      }}><Icon name={icon} size={20} /></View> : null}
      <TextInput ref={ref} selectionColor={colors.primary} cursorColor={colors.primary} placeholderTextColor={colors.placeholder} style={[styles.input, style]} secureTextEntry={password && !visible} onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }} onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }} {...props} />
      {password ? <Pressable accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(v => !v)} hitSlop={10}><Icon name={visible ? 'eye-off' : 'eye'} size={20} /></Pressable> : null}
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>;
});
const styles = StyleSheet.create({
  wrap: {
    gap: 7
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted
  },
  inputWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: 14
  },
  inputError: {
    borderColor: colors.danger
  },
  icon: {
    color: colors.primary,
    fontSize: 17,
    marginRight: 10
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontSize: 15
  },
  show: {
    color: colors.primary,
    fontWeight: '800',
    paddingLeft: 10
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  error: {
    color: colors.danger,
    fontSize: 12
  }
});