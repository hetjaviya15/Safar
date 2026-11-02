import { TravelPhoto } from '@/components/TravelPhoto';
import { CurrencyPicker, CurrencyPickerSheet } from '@/components/CurrencyPicker';
import { destinationFromTrip } from '@/services/places';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Icon } from '@/components/ui/Icon';
import { useDialog } from '@/components/ui/CustomModal';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ModalForm } from '@/components/ui/ModalForm';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { getTrip, updateTrip } from '@/services/trips';
import { formatDate, tripDuration } from '@/utils/date';
import { messageFromError } from '@/utils/errors';
import { AITab, BookingsTab, BudgetTab, ItineraryTab, MembersTab, NotesPhotosTab, PackingTab } from '@/features/workspace/WorkspaceModules';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
const tabs = ['Itinerary', 'Budget', 'Bookings', 'Packing', 'Notes & Photos', 'Members', 'AI'];
export default function TripWorkspaceScreen() {
  const Alert = useDialog();
  const {
    id,
    tab: initialTab
  } = useLocalSearchParams();
  const {
    user
  } = useAuth();
  const [trip, setTrip] = useState(null);
  const [role, setRole] = useState('viewer');
  const [tab, setTab] = useState(tabs.includes(initialTab) ? initialTab : 'Itinerary');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState('1');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (refresh = false) => {
    if (!id) return;
    if (refresh) setRefreshing(true);else setLoading(true);
    setError('');
    try {
      const loaded = await getTrip(id);
      setTrip(loaded);
      setTitle(loaded.title);
      setDestination(loaded.destination);
      setStartDate(loaded.start_date);
      setEndDate(loaded.end_date);
      setTravelers(String(loaded.travelers));
      setBudget(loaded.budget == null ? '' : String(loaded.budget));
      setCurrency(loaded.currency || 'INR');
      if (loaded.user_id === user?.id) setRole('owner');else {
        const {
          data
        } = await supabase.from('trip_members').select('role').eq('trip_id', id).eq('user_id', user?.id ?? '').maybeSingle();
        setRole(data?.role ?? 'viewer');
      }
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  if (loading) return <Screen><LoadingState label="Opening workspace…" /></Screen>;
  if (error || !trip) return <Screen><ErrorState message={error || 'Trip not found or access was revoked.'} onRetry={() => load()} /></Screen>;
  const currentTrip = trip;
  const canEdit = role === 'owner' || role === 'editor';
  async function saveTrip() {
    const count = Number(travelers);
    const amount = budget.trim() ? Number(budget) : null;
    if (!title.trim() || !destination.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate || !Number.isInteger(count) || count < 1 || amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      Alert.alert('Check trip details', 'Enter valid names, dates, traveler count and budget.');
      return;
    }
    setBusy(true);
    try {
      const changed = await updateTrip(currentTrip.id, {
        title: title.trim(),
        destination: destination.trim(),
        ...(destination.trim() !== currentTrip.destination ? {
          destination_lat: null,
          destination_lon: null,
          destination_place_id: null,
          cover_image_url: null
        } : {}),
        start_date: startDate,
        end_date: endDate,
        travelers: count,
        budget: amount,
        currency
      });
      setTrip(changed);
      setEditOpen(false);
    } catch (e) {
      Alert.alert('Could not update trip', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  function directions() {
    router.push({
      pathname: "/map",
      params: {
        tripId: currentTrip.id
      }
    });
  }
  function exportTrip() {
    router.push({
      pathname: "/export-trip",
      params: {
        tripId: currentTrip.id
      }
    });
  }
  return <><Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />} contentStyle={styles.content}><View style={styles.top}><Pressable onPress={() => router.back()}><Text style={styles.back}>← Trips</Text></Pressable><Pressable onPress={exportTrip}><Text style={styles.export}>Export PDF</Text></Pressable></View><TravelPhoto destination={destinationFromTrip(trip)} style={styles.hero}><Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}><Defs><LinearGradient id="trip-hero-fade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0%" stopColor={colors.navy} stopOpacity={0.04} /><Stop offset="48%" stopColor={colors.navy} stopOpacity={0.16} /><Stop offset="100%" stopColor={colors.navy} stopOpacity={0.88} /></LinearGradient></Defs><Rect width="100" height="100" fill="url(#trip-hero-fade)" /></Svg><View style={styles.heroCopy}><Text style={styles.status}>{trip.status.toUpperCase()} · {role.toUpperCase()}</Text><Text style={styles.title}>{trip.title}</Text><Text style={styles.destination}>⌖ {trip.destination}</Text><Text style={styles.meta}>{formatDate(trip.start_date)} – {formatDate(trip.end_date)} · {tripDuration(trip.start_date, trip.end_date)} days</Text><Text style={styles.meta}>{trip.travelers} traveler{trip.travelers === 1 ? '' : 's'} · {trip.budget != null ? `${trip.currency} ${Number(trip.budget).toLocaleString()} budget` : 'No fixed budget'}</Text></View></TravelPhoto><View style={styles.actions}><Pressable style={styles.action} onPress={directions}><Icon name="map" size={18} /><Text style={styles.actionText}>Map</Text></Pressable>{canEdit ? <Pressable style={styles.action} onPress={() => setEditOpen(true)}><Icon name="edit" size={18} /><Text style={styles.actionText}>Edit trip</Text></Pressable> : null}<Pressable style={styles.action} onPress={() => router.push({
          pathname: '/invite',
          params: {
            tripId: trip.id
          }
        })}><Icon name="users" size={18} /><Text style={styles.actionText}>Share</Text></Pressable></View><Pressable style={styles.aiAction} onPress={() => router.push({
        pathname: '/safar-ai',
        params: {
          tripId: trip.id,
          capability: canEdit ? 'suggest_itinerary' : 'trip_question'
        }
      })}><View style={styles.aiOrb}><Icon name="ai" color="#fff" /></View><View style={{
          flex: 1
        }}><Text style={styles.aiTitle}>Plan with Safar AI</Text><Text style={styles.aiCopy}>{canEdit ? 'Ask for changes, preview them, then approve.' : 'Ask questions about this shared trip.'}</Text></View><Text style={styles.aiArrow}>→</Text></Pressable><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityLabel="Trip sections; swipe to see more">{tabs.map(item => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    {["Itinerary", "Bookings", "Packing", "Budget", "Notes & Photos"].includes(tab) ? <Button label={`Open ${tab.toLowerCase()}`} icon="next" variant="ghost" onPress={() => router.push({
        pathname: "/trip-section",
        params: {
          tripId: trip.id,
          section: tab
        }
      })} /> : null}
    {tab === 'Itinerary' ? <ItineraryTab trip={trip} canEdit={canEdit} /> : tab === 'Budget' ? <BudgetTab trip={trip} canEdit={canEdit} /> : tab === 'Bookings' ? <BookingsTab trip={trip} canEdit={canEdit} /> : tab === 'Packing' ? <PackingTab trip={trip} canEdit={canEdit} /> : tab === 'Notes & Photos' ? <NotesPhotosTab trip={trip} canEdit={canEdit} /> : tab === 'Members' ? <MembersTab trip={trip} role={role} /> : <AITab trip={trip} canEdit={canEdit} />}
  </Screen><ModalForm visible={editOpen} title="Edit trip" onClose={() => setEditOpen(false)}><Field label="Trip name" value={title} onChangeText={setTitle} /><Field label="Destination" value={destination} onChangeText={setDestination} hint="Changing destination clears its cover and center pin, but keeps your saved activities. Review their locations before traveling." /><DateRangePicker allowPast start={startDate} end={endDate} onChange={(a, b) => {
        setStartDate(a);
        setEndDate(b);
      }} /><Field label="Travelers" value={travelers} onChangeText={setTravelers} keyboardType="number-pad" /><Field label={`Budget (${currency})`} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" /><Text style={styles.editHint}>Existing expense amounts keep their own currency. A saved budget keeps its original currency; no conversion or relabeling is applied.</Text><Text style={styles.editLabel}>Trip currency</Text><CurrencyPicker value={currency} onChange={value => {
        if (currentTrip.budget != null && value !== currentTrip.currency) Alert.alert('Saved budget protected', 'This trip already has a budget in its saved currency. That currency cannot be changed here.');else setCurrency(value);
      }} onMore={() => setShowCurrencyPicker(true)} /><Button label="Save changes" loading={busy} onPress={saveTrip} /></ModalForm><CurrencyPickerSheet visible={showCurrencyPicker} value={currency} onSelect={value => {
      if (currentTrip.budget != null && value !== currentTrip.currency) Alert.alert('Saved budget protected', 'This trip already has a budget in its saved currency. That currency cannot be changed here.');else setCurrency(value);
    }} onClose={() => setShowCurrencyPicker(false)} /></>;
}
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  back: {
    color: colors.primary,
    fontWeight: '800'
  },
  export: {
    color: colors.primary,
    fontWeight: '800'
  },
  hero: {
    width: '100%',
    height: 310,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end'
  },
  heroCopy: {
    zIndex: 1,
    padding: 20
  },
  status: {
    color: colors.highlight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1
  },
  title: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    marginTop: 5
  },
  destination: {
    color: colors.onHero,
    fontWeight: '800',
    marginTop: 6
  },
  meta: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    marginTop: 5
  },
  editHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  editLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: -8
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12
  },
  action: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 11,
    alignItems: 'center'
  },
  actionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  aiAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.aiSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12
  },
  aiOrb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center'
  },
  aiOrbText: {
    color: '#fff'
  },
  aiTitle: {
    color: colors.text,
    fontWeight: '900'
  },
  aiCopy: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  aiArrow: {
    color: colors.ai,
    fontSize: 21,
    fontWeight: '900'
  },
  tabs: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 16,
    paddingRight: 4
  },
  tab: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  tabTextActive: {
    color: colors.surface
  }
});