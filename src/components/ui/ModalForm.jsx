import { Icon } from './Icon';
import { Text } from '@/components/ui/Typography';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
export function ModalForm({
  visible,
  title,
  onClose,
  children
}) {
  return <Modal animationType="slide" visible={visible} transparent onRequestClose={onClose}><KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.sheet}><View style={styles.header}><Text style={styles.title}>{title}</Text><Pressable accessibilityLabel="Close form" onPress={onClose} hitSlop={12}><Icon name="close" color={colors.muted} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} contentContainerStyle={styles.content}>{children}</ScrollView></View></KeyboardAvoidingView></Modal>;
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end'
  },
  sheet: {
    maxHeight: '88%',
    minHeight: '35%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800'
  },
  close: {
    color: colors.muted,
    fontSize: 20
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 36
  }
});