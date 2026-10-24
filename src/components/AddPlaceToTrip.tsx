import { useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ModalForm } from './ui/ModalForm';
import { Button } from './ui/Button';
import { CategoryChip } from './ui/SafarUI';
import { useDialog } from './ui/CustomModal';
import { listTrips } from '@/services/trips';
import { addRow, workspace } from '@/services/workspace';
import type { NearbyPlace } from '@/services/destination-info';
import type { Trip } from '@/types/models';
import { colors } from '@/constants/theme';
import { tripDuration } from '@/utils/date';
import { messageFromError } from '@/utils/errors';

export function AddPlaceToTrip({ place }: { place: NearbyPlace }) {
  const [open, setOpen] = useState(false); const [trips, setTrips] = useState<Trip[]>([]);
  const [trip, setTrip] = useState<Trip>(); const [day, setDay] = useState(1);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const dialog = useDialog();
  async function show() {
    setOpen(true); setBusy(true); setError(''); setTrip(undefined); setDay(1);
    try { const result = await listTrips(); if (result.cached) throw new Error('Connect to the internet to add a place.');
      setTrips(result.trips.filter(t => !t.archived_at && (t.member_role === 'owner' || t.member_role === 'editor')));
    } catch (e) { setError(messageFromError(e)); } finally { setBusy(false); }
  }
  async function save() {
    if (!trip) return; setBusy(true); setError('');
    try {
      const activities = await workspace.activities(trip.id);
      await addRow('activities', { trip_id: trip.id, day_number: day, title: place.name, location: place.name,
        latitude: place.latitude, longitude: place.longitude, notes: place.detail + '\nSource: ' + place.sourceUrl + ' (Wikipedia contributors, CC BY-SA; excerpt).',
        sort_order: Math.max(-1, ...activities.filter(a => a.day_number === day).map(a => a.sort_order)) + 1,
        currency: trip.currency });
      setOpen(false);
      dialog.alert('Added to your itinerary', place.name + ' · Day ' + day, [
        { text: 'Keep exploring' }, { text: 'Open trip', onPress: () => router.push({ pathname: '/trip/[id]', params: { id: trip.id } }) },
      ]);
    } catch (e) { setError(messageFromError(e)); } finally { setBusy(false); }
  }
  return <><Button label="Add to trip" icon="plus" variant="secondary" onPress={show} />
    <ModalForm visible={open} title="Add this place" onClose={() => { if (!busy) setOpen(false); }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{place.name}</Text>
      <Text style={{ color: colors.muted }}>Choose a trip you can edit, then a day. Your saved itinerary changes only when you tap Add.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
      {!busy && !trips.length ? <Text>No editable trips yet. Create a trip first, then add this place.</Text> : null}
      {trips.map(t => <Button key={t.id} label={t.title + ' · ' + t.destination} variant={trip?.id === t.id ? 'primary' : 'secondary'} disabled={busy} onPress={() => { setTrip(t); setDay(1); }} />)}
      {trip ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <CategoryChip label="−" selected={false} onPress={() => setDay(v => Math.max(1, v - 1))} />
        <Text style={{ color: colors.text }}>Day {day} of {tripDuration(trip.start_date, trip.end_date)}</Text>
        <CategoryChip label="+" selected={false} onPress={() => setDay(v => Math.min(tripDuration(trip.start_date, trip.end_date), v + 1))} />
      </View> : null}
      <Button label="Add to itinerary" loading={busy} disabled={!trip} onPress={save} />
    </ModalForm>
  </>;
}
