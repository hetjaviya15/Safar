import { useDialog } from '@/components/ui/CustomModal';
import { useAuth } from '@/context/auth';
import { useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { colors, radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { messageFromError } from '@/utils/errors';
export default function ResetPasswordScreen() {
  const Alert = useDialog();
  const {
    isPasswordRecovery,
    finishRecovery,
    cancelRecovery
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  async function update() {
    if (password.length < 8 || password !== confirm) {
      Alert.alert('Check passwords', 'Use at least 8 characters and make sure both passwords match.');
      return;
    }
    setBusy(true);
    try {
      const {
        data,
        error: userError
      } = await supabase.auth.getUser();
      if (!isPasswordRecovery || userError || !data.user) throw new Error('Open this screen from the latest password-reset link in your email.');
      const {
        error
      } = await supabase.auth.updateUser({
        password
      });
      if (error) throw error;
      Alert.alert('Password updated', 'You can continue to Safar.', [{
        text: 'Continue',
        onPress: finishRecovery
      }]);
    } catch (e) {
      Alert.alert('Could not update password', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  return <Screen contentStyle={styles.screen}><View style={styles.card}><Text style={styles.title}>Choose a new password</Text><Text style={styles.copy}>For your security, use the most recent reset link. Reset links expire.</Text><Field label="New password" password value={password} onChangeText={setPassword} autoComplete="new-password" /><Field label="Confirm password" password value={confirm} onChangeText={setConfirm} autoComplete="new-password" /><Button label="Update password" loading={busy} onPress={update} /><Button label="Back to sign in" variant="ghost" disabled={busy} onPress={() => {
        void cancelRecovery().catch(() => Alert.alert('Please try again', 'Could not finish signing out. Close and reopen Safar.'));
      }} /></View></Screen>;
}
const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    flexGrow: 1
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text
  },
  copy: {
    color: colors.muted,
    lineHeight: 21
  }
});