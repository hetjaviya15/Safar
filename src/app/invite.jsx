import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Pressable, StyleSheet, View } from 'react-native';
import { MembersTab } from '@/features/workspace/WorkspaceModules';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { getTrip } from '@/services/trips';
import { messageFromError } from '@/utils/errors';
export default function InviteScreen() {
  const {
    tripId
  } = useLocalSearchParams();
  const {
    user
  } = useAuth();
  const [trip, setTrip] = useState(null);
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError('');
    try {
      const value = await getTrip(tripId);
      setTrip(value);
      if (value.user_id === user?.id) setRole('owner');else {
        const {
          data,
          error: memberError
        } = await supabase.from('trip_members').select('role').eq('trip_id', tripId).eq('user_id', user?.id ?? '').maybeSingle();
        if (memberError) throw memberError;
        setRole(data?.role ?? 'viewer');
      }
    } catch (loadError) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  }, [tripId, user?.id]);
  useEffect(() => {
    load();
  }, [load]);
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Trip workspace</Text></Pressable>
    <View style={styles.header}>
      <Text style={styles.eyebrow}>TRAVEL TOGETHER</Text>
      <Text style={styles.title}>Invite family & friends</Text>
      <Text style={styles.subtitle}>Share a private code and choose whether each person can edit the plan or view it.</Text>
    </View>
    {loading ? <LoadingState label="Loading trip access…" /> : error || !trip ? <ErrorState message={error || 'Trip not found.'} onRetry={load} /> : <MembersTab trip={trip} role={role} />}
  </Screen>;
}
const styles = StyleSheet.create({
  back: {
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 22
  },
  header: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 22,
    marginBottom: 10
  },
  eyebrow: {
    color: colors.onHero,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6
  },
  title: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    marginTop: 7
  },
  subtitle: {
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 20,
    marginTop: 7
  }
});