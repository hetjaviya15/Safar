import { BrandLogo } from '@/components/BrandLogo';
import { TravelPhoto } from '@/components/TravelPhoto';
import { destinationFromTrip } from '@/services/places';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Platform, StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Screen } from '@/components/ui/Screen';
import { AppHeader, IconButton } from '@/components/ui/SafarUI';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useDialog } from '@/components/ui/CustomModal';
import { colors } from '@/constants/theme';
import { getTrip } from '@/services/trips';
import { workspace } from '@/services/workspace';
import { buildTripHtml } from '@/services/export';
import { formatDate, tripDuration } from '@/utils/date';
export default function ExportTripScreen() {
  const {
    tripId
  } = useLocalSearchParams();
  const [trip, setTrip] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useDialog();
  const load = useCallback(async () => {
    setError('');
    try {
      const [t, activities, bookings, expenses, packing, notes] = await Promise.all([getTrip(tripId), workspace.activities(tripId), workspace.bookings(tripId), workspace.expenses(tripId), workspace.packing(tripId), workspace.notes(tripId)]);
      setTrip(t);
      setData({
        activities,
        bookings,
        expenses,
        packing,
        notes
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load trip.');
    }
  }, [tripId]);
  useEffect(() => {
    load();
  }, [load]);
  async function exportFile(preview) {
    if (!trip || !data) return;
    setBusy(true);
    try {
      const html = buildTripHtml(trip, data);
      if (preview || Platform.OS === 'web') await Print.printAsync({
        html
      });else {
        const file = await Print.printToFileAsync({
          html
        });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: '.pdf',
          dialogTitle: trip.title
        });else dialog.alert('PDF ready', file.uri);
      }
    } catch (e) {
      dialog.alert('Could not export', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return <Screen><AppHeader title="Export itinerary" subtitle="Your whole journey, beautifully organized." left={<IconButton icon="back" label="Go back" onPress={() => router.back()} />} />{error ? <ErrorState message={error} onRetry={load} /> : !trip || !data ? <LoadingState /> : <><View style={s.paper}><TravelPhoto destination={destinationFromTrip(trip)} style={s.image} /><View style={s.copy}><BrandLogo size={42} /><Text style={s.title}>{trip.title}</Text><Text style={s.meta}>{trip.destination}</Text><Text style={s.meta}>{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</Text><Text style={s.meta}>{tripDuration(trip.start_date, trip.end_date)} days · {trip.travelers} travelers</Text><View style={s.line} /><Text style={s.heading}>Your itinerary</Text>{data.activities.slice(0, 5).map(a => <View key={a.id} style={s.activity}><Text style={s.day}>DAY {a.day_number}</Text><Text style={s.heading}>{a.title}</Text><Text style={s.meta}>{a.starts_at} {a.location}</Text></View>)}{!data.activities.length ? <Text style={s.meta}>Add activities in your workspace to fill your itinerary.</Text> : null}<Text style={s.meta}>{data.bookings.length} bookings · {data.packing.length} packing items · {data.expenses.length} expenses</Text></View></View><Button icon="eye" label="Preview PDF" variant="secondary" disabled={busy} onPress={() => exportFile(true)} /><View style={{
        height: 12
      }} /><Button icon="download" label={Platform.OS === 'web' ? 'Print / Save PDF' : 'Download & share PDF'} loading={busy} onPress={() => exportFile(false)} /><Text style={s.foot}>Includes itinerary, bookings, expenses, packing and notes. Share only with people you trust.</Text></>}</Screen>;
}
const s = StyleSheet.create({
  paper: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: 24
  },
  image: {
    width: '100%',
    height: 190
  },
  copy: {
    padding: 22,
    gap: 8
  },
  brand: {
    color: colors.primary,
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: '800'
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '800'
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19
  },
  heading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  line: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14
  },
  activity: {
    borderLeftWidth: 3,
    borderColor: colors.accent,
    paddingLeft: 14,
    paddingVertical: 8,
    gap: 3
  },
  day: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800'
  },
  foot: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    fontSize: 12,
    marginTop: 16
  }
});