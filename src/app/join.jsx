import { useDialog } from '@/components/ui/CustomModal';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { colors, radius } from '@/constants/theme';
import { acceptInvitation, rejectInvitation } from '@/services/workspace';
import { messageFromError } from '@/utils/errors';
export default function JoinTripScreen() {
  const Alert = useDialog();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  async function accept() {
    if (code.trim().length < 8) {
      Alert.alert('Invalid code', 'Enter the full invitation code.');
      return;
    }
    setBusy(true);
    try {
      const tripId = await acceptInvitation(code);
      router.replace(`/trip/${tripId}`);
    } catch (e) {
      Alert.alert('Could not join trip', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  async function reject() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await rejectInvitation(code);
      Alert.alert('Invitation declined');
      router.back();
    } catch (e) {
      Alert.alert('Could not decline', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  return <Screen><Text style={styles.back} onPress={() => router.back()}>← Back</Text><View style={styles.card}><Text style={styles.icon}>🤝</Text><Text style={styles.title}>Join a trip</Text><Text style={styles.copy}>Sign in first, then enter the private code shared by the trip owner. A code never bypasses authentication.</Text><Field label="Invitation code" value={code} onChangeText={value => setCode(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="SAFAR-XXXXXXXX" /><Button label="Accept invitation" loading={busy} onPress={accept} /><Button label="Decline invitation" variant="ghost" disabled={busy || !code} onPress={reject} /></View></Screen>;
}
const styles = StyleSheet.create({
  back: {
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 20
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 20,
    gap: 16
  },
  icon: {
    fontSize: 42,
    textAlign: 'center'
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center'
  },
  copy: {
    color: colors.muted,
    lineHeight: 21,
    textAlign: 'center'
  }
});