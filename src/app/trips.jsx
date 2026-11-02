import { TravelPhoto } from '@/components/TravelPhoto';
import { destinationFromTrip } from '@/services/places';
import { useDialog } from '@/components/ui/CustomModal';
import { Icon } from '@/components/ui/Icon';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, TextInput } from '@/components/ui/Typography';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BottomNav } from '@/components/BottomNav';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { colors, radius } from '@/constants/theme';
import { archiveTrip, deleteTrip, duplicateTrip, listTrips, restoreTrip } from '@/services/trips';
import { formatDate } from '@/utils/date';
import { messageFromError } from '@/utils/errors';
const filters = ['all', 'draft', 'upcoming', 'ongoing', 'completed', 'shared', 'archived'];
export default function TripsScreen() {
  const Alert = useDialog();
  const params = useLocalSearchParams();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(params.filter === 'shared' ? 'shared' : 'all');
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);else setLoading(true);
    setError('');
    try {
      setTrips((await listTrips()).trips);
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  const shown = useMemo(() => trips.filter(t => {
    const matchesQuery = `${t.title} ${t.destination}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'shared' ? Boolean(t.member_role && t.member_role !== 'owner') : filter === 'archived' ? Boolean(t.archived_at) : !t.archived_at && t.status === filter);
    return matchesQuery && matchesFilter;
  }), [trips, query, filter]);
  function menu(trip) {
    const isOwner = !trip.member_role || trip.member_role === 'owner';
    Alert.alert(trip.title, 'Choose an action', [{
      text: 'Open',
      onPress: () => router.push(`/trip/${trip.id}`)
    }, ...(isOwner ? [{
      text: 'Duplicate',
      onPress: async () => {
        try {
          await duplicateTrip(trip);
          load();
        } catch (e) {
          Alert.alert('Could not duplicate', messageFromError(e));
        }
      }
    }, {
      text: trip.archived_at ? 'Restore' : 'Archive',
      onPress: async () => {
        try {
          if (trip.archived_at) await restoreTrip(trip.id);else await archiveTrip(trip.id);
          load();
        } catch (e) {
          Alert.alert(`Could not ${trip.archived_at ? 'restore' : 'archive'}`, messageFromError(e));
        }
      }
    }, {
      text: 'Delete permanently',
      style: 'destructive',
      onPress: () => Alert.alert('Delete this trip?', 'Its itinerary, expenses, bookings and shared content will also be deleted. This cannot be undone.', [{
        text: 'Cancel',
        style: 'cancel'
      }, {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTrip(trip.id);
            load();
          } catch (e) {
            Alert.alert('Could not delete', messageFromError(e));
          }
        }
      }])
    }] : []), {
      text: 'Cancel',
      style: 'cancel'
    }]);
  }
  return <View style={{
    flex: 1
  }}><Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}><View style={styles.head}><View><Text style={styles.title}>My trips</Text><Text style={styles.subtitle}>Every journey, in one place.</Text></View><Pressable style={styles.add} onPress={() => router.push('/create-trip')}><Icon name="plus" color="#fff" /></Pressable></View><View style={styles.search}><Icon name="search" /><TextInput value={query} onChangeText={setQuery} placeholder="Search trips" placeholderTextColor={colors.placeholder} style={styles.input} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}</ScrollView>{loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => load()} /> : shown.length === 0 ? trips.length === 0 ? <EmptyState icon="🧭" title="Your adventures start here" message="Plan your first trip to keep destinations, dates and details together." actionLabel="Create Your First Trip" onAction={() => router.push('/create-trip')} /> : <View style={styles.noResults}><EmptyState icon="🔎" title="No matching trips" message="Try a different search or filter." /><Pressable style={styles.clearFilters} onPress={() => {
          setQuery('');
          setFilter('all');
        }}><Text style={styles.clearFiltersText}>Clear filters</Text></Pressable></View> : shown.map(trip => {
        return <Pressable key={trip.id} style={styles.card} onPress={() => router.push(`/trip/${trip.id}`)} onLongPress={() => menu(trip)}><TravelPhoto destination={destinationFromTrip(trip)} style={styles.cover} /><View style={styles.copy}><View style={styles.cardTop}><Text style={styles.cardTitle} numberOfLines={1}>{trip.title}</Text><Pressable onPress={() => menu(trip)} hitSlop={10}><Text style={styles.more}>•••</Text></Pressable></View><Text style={styles.destination} numberOfLines={1}>⌖ {trip.destination}</Text><Text style={styles.date}>{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</Text><View style={styles.badges}><Text style={styles.badge}>{trip.archived_at ? 'archived' : trip.status}</Text>{trip.member_role && trip.member_role !== 'owner' ? <Text style={styles.shared}>shared · {trip.member_role}</Text> : null}</View></View></Pressable>;
      })}</Screen><BottomNav /></View>;
}
const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4
  },
  add: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addText: {
    color: colors.surface,
    fontSize: 27
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginTop: 20
  },
  input: {
    height: 50,
    flex: 1,
    marginLeft: 8,
    color: colors.text
  },
  filters: {
    flexDirection: 'row',
    gap: 7,
    marginVertical: 14,
    paddingRight: 4
  },
  filter: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  filterTextActive: {
    color: colors.surface
  },
  noResults: {
    alignItems: 'center'
  },
  clearFilters: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted
  },
  clearFiltersText: {
    color: colors.primary,
    fontWeight: '800'
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: 11,
    overflow: 'hidden'
  },
  cover: {
    width: 92,
    height: 112,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted
  },
  copy: {
    flex: 1,
    marginLeft: 12,
    gap: 5,
    justifyContent: 'center'
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: '900',
    fontSize: 17
  },
  more: {
    color: colors.muted,
    paddingLeft: 8
  },
  destination: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13
  },
  date: {
    color: colors.muted,
    fontSize: 12
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    color: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  shared: {
    backgroundColor: colors.aiSoft,
    color: colors.ai,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '800'
  }
});