import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { AppHeader, IconButton } from '@/components/ui/SafarUI';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TravelMap } from '@/components/TravelMap';
import { loadDestinationInfo } from '@/services/destination-info';
import { getTrip } from '@/services/trips';
import { workspace } from '@/services/workspace';
import { destinationFromTrip, directionsUrl, guides, hasCoordinates, parseDestination } from '@/services/places';
import { colors } from '@/constants/theme';
import { useDialog } from '@/components/ui/CustomModal';
export default function MapScreen() {
  const {
    tripId,
    data
  } = useLocalSearchParams();
  const [points, setPoints] = useState([]);
  const [selected, setSelected] = useState('');
  const [destination, setDestination] = useState('');
  const [unmapped, setUnmapped] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const dialog = useDialog();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const trip = tripId ? await getTrip(tripId) : null;
        const d = trip ? destinationFromTrip(trip) : parseDestination(data);
        if (!d) throw new Error('Choose a destination or open a saved trip first.');
        const activities = trip ? await workspace.activities(trip.id) : [];
        const list = hasCoordinates(d) ? [{
          id: d.placeId,
          name: d.name,
          latitude: d.latitude,
          longitude: d.longitude,
          detail: d.displayName
        }] : [];
        for (const a of activities) {
          if (a.latitude != null && a.longitude != null) list.push({
            id: a.id,
            name: a.title,
            latitude: a.latitude,
            longitude: a.longitude,
            detail: a.location ?? undefined
          });
        }
        if (!trip) {
          const info = await loadDestinationInfo(d).catch(() => null);
          for (const p of info?.nearby ?? []) list.push({
            id: p.id,
            name: p.name,
            latitude: p.latitude,
            longitude: p.longitude,
            detail: p.detail
          });
        }
        for (const p of guides[d.placeId]?.highlights ?? []) list.push({
          id: p.name,
          ...p
        });
        if (active) {
          setPoints(list);
          setSelected(list[0]?.id ?? '');
          setDestination(d.displayName);
          setUnmapped(activities.filter(a => a.latitude == null || a.longitude == null));
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load map');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tripId, data]);
  async function directions(name, coordinate) {
    try {
      await Linking.openURL(coordinate ? `https://www.google.com/maps/dir/?api=1&destination=${coordinate.latitude},${coordinate.longitude}` : directionsUrl(name, destination));
    } catch {
      dialog.alert('Could not open Maps', 'Try again with a maps application installed.');
    }
  }
  const point = points.find(p => p.id === selected);
  return <Screen><AppHeader title="Your journey on the map" subtitle={destination} left={<IconButton icon="back" label="Go back" onPress={() => router.back()} />} />{loading ? <LoadingState /> : error ? <ErrorState message={error} /> : <>{points.length ? <TravelMap points={points} selected={selected} onSelect={setSelected} /> : <EmptyState icon="map" title="Find this destination" message="This custom destination has no saved coordinates. Open Maps to search by its full name." />}{point ? <View style={s.card}><Text style={s.title}>{point.name}</Text><Text style={s.copy}>{point.detail}</Text><Button icon="map" label="Directions" onPress={() => directions(point.name, point)} /></View> : <Button label="Search in Maps" onPress={() => directions('')} />}<View style={s.chips}>{points.map(p => <Pressable key={p.id} onPress={() => setSelected(p.id)} style={[s.chip, selected === p.id && s.active]}><Text style={{
            color: selected === p.id ? '#fff' : colors.primary
          }}>{p.name}</Text></Pressable>)}</View>{unmapped.length ? <><Text style={s.title}>Your itinerary places</Text><Text style={s.copy}>Open each saved place with your trip destination included in the search.</Text>{unmapped.map(a => <Pressable key={a.id} style={s.card} onPress={() => directions(a.location || a.title)}><Text style={s.title}>{a.title}</Text><Text style={s.copy}>{a.location || destination} · Open directions</Text></Pressable>)}</> : null}</>}</Screen>;
}
const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginVertical: 12
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
  },
  copy: {
    color: colors.muted,
    lineHeight: 20
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10
  },
  active: {
    backgroundColor: colors.primary
  }
});