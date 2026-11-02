import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Screen } from '@/components/ui/Screen';
import { AppHeader, IconButton } from '@/components/ui/SafarUI';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { getTrip } from '@/services/trips';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { BookingsTab, BudgetTab, ItineraryTab, PackingTab, NotesPhotosTab } from '@/features/workspace/WorkspaceModules';
export default function TripSectionScreen() {
  const {
    tripId,
    section = 'Itinerary'
  } = useLocalSearchParams();
  const {
    user
  } = useAuth();
  const [trip, setTrip] = useState(null);
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      try {
        const t = await getTrip(tripId);
        let r = 'owner';
        if (t.user_id !== user?.id) {
          const {
            data,
            error
          } = await supabase.from('trip_members').select('role').eq('trip_id', tripId).eq('user_id', user?.id ?? '').maybeSingle();
          if (error) throw error;
          r = data?.role ?? 'viewer';
        }
        if (active) {
          setTrip(t);
          setRole(r);
          setError('');
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load trip.');
      }
    })();
    return () => {
      active = false;
    };
  }, [tripId, user?.id]));
  const canEdit = role !== 'viewer';
  return <Screen><AppHeader title={section} subtitle={trip?.title} left={<IconButton icon="back" label="Back to trip" onPress={() => router.back()} />} />{error ? <ErrorState message={error} /> : !trip ? <LoadingState /> : section === 'Bookings' ? <BookingsTab trip={trip} canEdit={canEdit} /> : section === 'Packing' ? <PackingTab trip={trip} canEdit={canEdit} /> : section === 'Budget' ? <BudgetTab trip={trip} canEdit={canEdit} /> : section === 'Notes & Photos' ? <NotesPhotosTab trip={trip} canEdit={canEdit} /> : <ItineraryTab trip={trip} canEdit={canEdit} />}</Screen>;
}