import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

type Props = ScrollViewProps & { children: React.ReactNode; scroll?: boolean; contentStyle?: ViewStyle };
export function Screen({ children, scroll = true, contentStyle, ...props }: Props) {
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, contentStyle]} {...props}>{children}</ScrollView> : <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 110 }, flex: { flex: 1 } });
