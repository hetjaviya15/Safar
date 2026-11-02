import { searchDestinations } from '@/services/destinations';
import { Icon } from '@/components/ui/Icon';
import { CategoryChip } from '@/components/ui/SafarUI';
import { BudgetBreakdown } from '@/features/workspace/BudgetBreakdown';
import { directionsUrl } from '@/services/places';
import { useDialog } from '@/components/ui/CustomModal';
import * as ImagePicker from 'expo-image-picker';
import { base64ToUint8Array } from '@/utils/binary';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Image, Linking, Pressable, Share, StyleSheet, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ModalForm } from '@/components/ui/ModalForm';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { addRow, editRow, removeRow, workspace } from '@/services/workspace';
import { todayKey, tripDuration } from '@/utils/date';
import { messageFromError } from '@/utils/errors';
function Section({
  title,
  subtitle,
  action,
  onAction
}) {
  return <View style={s.sectionHead}><View style={{
      flex: 1
    }}><Text style={s.sectionTitle}>{title}</Text>{subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}</View>{action && onAction ? <Pressable style={s.smallAction} onPress={onAction}><Text style={s.smallActionText}>{action}</Text></Pressable> : null}</View>;
}
function Failure({
  error,
  retry
}) {
  return error ? <ErrorState message={error.includes('schema cache') ? 'This workspace module needs the included Supabase migration to be applied.' : error} onRetry={retry} /> : null;
}
export function ItineraryTab({
  trip,
  canEdit
}) {
  const Alert = useDialog();
  const days = tripDuration(trip.start_date, trip.end_date);
  const [day, setDay] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [place, setPlace] = useState(null);
  const [placeResults, setPlaceResults] = useState([]);
  const [finding, setFinding] = useState(false);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await workspace.activities(trip.id));
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, [trip.id]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  const shown = items.filter(i => i.day_number === day).sort((a, b) => a.sort_order - b.sort_order);
  function showForm(item) {
    setPlace(item?.latitude != null && item.longitude != null ? {
      latitude: item.latitude,
      longitude: item.longitude
    } : null);
    setPlaceResults([]);
    setEditing(item ?? null);
    setTitle(item?.title ?? '');
    setLocation(item?.location ?? trip.destination);
    setTime(item?.starts_at ?? '');
    setNotes(item?.notes ?? '');
    setCost(item?.estimated_cost == null ? '' : String(item.estimated_cost));
    setOpen(true);
  }
  async function save() {
    if (!title.trim() || cost && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) {
      Alert.alert('Check activity', 'Enter a title and a valid non-negative cost.');
      return;
    }
    setBusy(true);
    try {
      const row = {
        trip_id: trip.id,
        day_number: day,
        title: title.trim(),
        latitude: place?.latitude ?? null,
        longitude: place?.longitude ?? null,
        location: location.trim() || null,
        starts_at: time.trim() || null,
        notes: notes.trim() || null,
        estimated_cost: cost ? Number(cost) : null,
        currency: editing?.currency ?? trip.currency,
        sort_order: editing?.sort_order ?? Math.max(-1, ...shown.map(a => a.sort_order)) + 1,
        is_completed: editing?.is_completed ?? false
      };
      if (editing) await editRow('activities', editing.id, row);else await addRow('activities', row);
      setOpen(false);
      load();
    } catch (e) {
      Alert.alert('Could not save activity', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  async function findPlace() {
    if (location.trim().length < 2) return;
    setFinding(true);
    try {
      const near = trip.destination_lat != null && trip.destination_lon != null ? {
        latitude: trip.destination_lat,
        longitude: trip.destination_lon
      } : undefined;
      setPlaceResults(await searchDestinations(`${location}, ${trip.destination}`, undefined, near));
    } catch (e) {
      Alert.alert('Could not find place', messageFromError(e));
    } finally {
      setFinding(false);
    }
  }
  async function patch(item, changes) {
    try {
      await editRow('activities', item.id, changes);
      load();
    } catch (e) {
      Alert.alert('Could not update activity', messageFromError(e));
    }
  }
  async function remove(item) {
    Alert.alert('Delete activity?', item.title, [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          await removeRow('activities', item.id);
          load();
        } catch (e) {
          Alert.alert('Could not delete', messageFromError(e));
        }
      }
    }]);
  }
  return <View><Section title="Day-by-day itinerary" subtitle={`${days} day${days === 1 ? '' : 's'} · ${trip.destination}`} action={canEdit ? '+ Activity' : undefined} onAction={() => showForm()} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayRow}>{Array.from({
        length: days
      }).map((_, i) => <Pressable key={i} onPress={() => setDay(i + 1)} style={[s.day, day === i + 1 && s.dayActive]}><Text style={[s.dayText, day === i + 1 && s.dayTextActive]}>Day {i + 1}</Text></Pressable>)}</ScrollView>{loading ? <LoadingState /> : error ? <Failure error={error} retry={load} /> : shown.length === 0 ? <EmptyState icon="🗓️" title={`Day ${day} is open`} message={canEdit ? 'Add an activity, meal, stop or reminder.' : 'The trip editor has not added activities yet.'} actionLabel={canEdit ? 'Add activity' : undefined} onAction={canEdit ? () => showForm() : undefined} /> : shown.map((item, index) => <View key={item.id} style={[s.item, item.is_completed && s.completed]}><Pressable disabled={!canEdit} onPress={() => patch(item, {
        is_completed: !item.is_completed
      })} style={s.check}><Text style={s.checkText}>{item.is_completed ? '✓' : ''}</Text></Pressable><Pressable style={{
        flex: 1
      }} onPress={() => canEdit && showForm(item)}><Text style={s.itemTitle}>{item.starts_at ? `${item.starts_at} · ` : ''}{item.title}</Text>{item.location ? <Text style={[s.itemMeta, {
          color: colors.primary
        }]} onPress={() => Linking.openURL(directionsUrl(item.location || item.title, trip.destination))}>📍 {item.location} · directions</Text> : null}{item.notes ? <Text style={s.itemMeta}>{item.notes}</Text> : null}{item.estimated_cost ? <Text style={s.itemCost}>{item.currency ?? trip.currency} {Number(item.estimated_cost).toLocaleString()}</Text> : null}</Pressable>{canEdit ? <View><Pressable disabled={day <= 1} onPress={() => patch(item, {
          day_number: day - 1
        })}><Text style={s.tiny}>← day</Text></Pressable><Pressable disabled={day >= days} onPress={() => patch(item, {
          day_number: day + 1
        })}><Text style={s.tiny}>day →</Text></Pressable><Pressable onPress={() => remove(item)}><Text style={s.delete}>Delete</Text></Pressable>{index > 0 ? <Pressable onPress={() => patch(item, {
          sort_order: shown[index - 1].sort_order - 1
        })}><Text style={s.tiny}>Move up</Text></Pressable> : null}</View> : null}</View>)}<ModalForm visible={open} title={editing ? 'Edit activity' : `Add to Day ${day}`} onClose={() => setOpen(false)}><Field label="Activity" value={title} onChangeText={setTitle} placeholder="Museum, lunch, hike…" /><Field label="Time" value={time} onChangeText={setTime} placeholder="09:30" /><Field label="Location" value={location} onChangeText={value => {
        setLocation(value);
        setPlace(null);
        setPlaceResults([]);
      }} hint={`Search around ${trip.destination}, or keep a custom address.`} /><Button label="Find place on map" icon="pin" variant="secondary" loading={finding} onPress={findPlace} /><Field label={`Estimated cost (${editing?.currency ?? trip.currency})`} value={cost} onChangeText={setCost} keyboardType="decimal-pad" />{placeResults.map(p => <Pressable key={p.placeId} style={s.item} onPress={() => {
        setLocation(p.displayName);
        setPlace(p.latitude != null && p.longitude != null ? {
          latitude: p.latitude,
          longitude: p.longitude
        } : null);
        setPlaceResults([]);
      }}><Icon name="pin" /><Text style={{
          color: colors.text,
          flex: 1
        }}>{p.displayName}</Text></Pressable>)}{place ? <Text style={s.subtitle}>Map pin selected</Text> : null}<Field label="Notes" value={notes} onChangeText={setNotes} multiline /><Button label="Save activity" loading={busy} onPress={save} /></ModalForm></View>;
}
export function BudgetTab({
  trip,
  canEdit
}) {
  const Alert = useDialog();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(todayKey());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await workspace.expenses(trip.id));
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, [trip.id]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  const total = items.filter(item => item.currency === trip.currency).reduce((sum, item) => sum + Number(item.amount), 0);
  const remaining = trip.budget == null ? null : Number(trip.budget) - total;
  const progress = trip.budget ? Math.min(1, total / Number(trip.budget)) : 0;
  function show(item) {
    setEditing(item ?? null);
    setTitle(item?.title ?? '');
    setAmount(item ? String(item.amount) : '');
    setCategory(item?.category ?? 'Food');
    setDate(item?.spent_on ?? todayKey());
    setNotes(item?.notes ?? '');
    setOpen(true);
  }
  async function save() {
    if (!title.trim() || !amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Check expense details', 'Enter a description, amount and date (YYYY-MM-DD).');
      return;
    }
    setBusy(true);
    try {
      const row = {
        trip_id: trip.id,
        title: title.trim(),
        amount: Number(amount),
        category,
        currency: editing?.currency ?? trip.currency,
        spent_on: date,
        notes: notes.trim() || null
      };
      if (editing) await editRow('expenses', editing.id, row);else await addRow('expenses', row);
      setOpen(false);
      load();
    } catch (e) {
      Alert.alert('Could not save expense', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  return <View><Section title="Budget & expenses" subtitle="Actual spending is based on entries below." action={canEdit ? '+ Expense' : undefined} onAction={() => show()} /><BudgetBreakdown expenses={items} currency={trip.currency} budget={trip.budget} /><View style={s.metrics}><Metric label="Planned" value={trip.budget == null ? 'No limit' : `${trip.currency} ${Number(trip.budget).toLocaleString()}`} /><Metric label="Total spent" value={`${trip.currency} ${total.toLocaleString()}`} /><Metric label="Remaining" value={remaining == null ? '—' : `${trip.currency} ${remaining.toLocaleString()}`} /></View>{trip.budget ? <View style={s.bar}><View style={[s.barFill, {
        width: `${progress * 100}%`,
        backgroundColor: progress >= 1 ? colors.danger : colors.accent
      }]} /></View> : null}{loading ? <LoadingState /> : error ? <Failure error={error} retry={load} /> : items.length === 0 ? <EmptyState icon="💳" title="No expenses yet" message="Add spending as it happens to keep the budget accurate." /> : items.map(item => <Pressable key={item.id} style={s.item} onPress={() => canEdit && show(item)}><View style={s.categoryIcon}><Text>₹</Text></View><View style={{
        flex: 1
      }}><Text style={s.itemTitle}>{item.title}</Text><Text style={s.itemMeta}>{item.category} · {item.spent_on}</Text></View><Text style={s.amount}>{item.currency} {Number(item.amount).toLocaleString()}</Text>{canEdit ? <Pressable onPress={() => removeRow('expenses', item.id).then(load).catch(e => Alert.alert('Could not delete', messageFromError(e)))}><Text style={s.delete}>✕</Text></Pressable> : null}</Pressable>)}<ModalForm visible={open} title={editing ? 'Edit expense' : 'Add expense'} onClose={() => setOpen(false)}><Field label="Description" value={title} onChangeText={setTitle} /><Field label={`Amount (${editing?.currency ?? trip.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /><Field label="Category" value={category} onChangeText={setCategory} hint="Transportation, Accommodation, Food, Activities, Shopping, Miscellaneous" /><Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} /><Field label="Notes" value={notes} onChangeText={setNotes} /><Button label="Save expense" loading={busy} onPress={save} /></ModalForm></View>;
}
function Metric({
  label,
  value
}) {
  return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue} numberOfLines={1}>{value}</Text></View>;
}
export function BookingsTab({
  trip,
  canEdit
}) {
  const Alert = useDialog();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [type, setType] = useState('flight');
  const [bookingFilter, setBookingFilter] = useState('All');
  const [status, setStatus] = useState('planned');
  const [provider, setProvider] = useState('');
  const [reference, setReference] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await workspace.bookings(trip.id));
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, [trip.id]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  function show(item) {
    setStatus(item?.status ?? 'planned');
    setEditing(item ?? null);
    setType(item?.booking_type ?? 'flight');
    setProvider(item?.provider ?? '');
    setReference(item?.reference ?? '');
    setFrom(item?.departure ?? '');
    setTo(item?.arrival ?? '');
    setDate(item?.starts_at ?? '');
    setCost(item?.cost == null ? '' : String(item.cost));
    setNotes(item?.notes ?? '');
    setOpen(true);
  }
  async function save() {
    if (!provider.trim() || cost && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) {
      Alert.alert('Check booking details', 'Enter a provider and a valid cost.');
      return;
    }
    setBusy(true);
    try {
      const row = {
        trip_id: trip.id,
        booking_type: type,
        provider: provider.trim(),
        reference: reference.trim() || null,
        departure: from.trim() || null,
        arrival: to.trim() || null,
        starts_at: date.trim() || null,
        cost: cost ? Number(cost) : null,
        currency: editing?.currency ?? trip.currency,
        notes: notes.trim() || null,
        status
      };
      if (editing) await editRow('bookings', editing.id, row);else await addRow('bookings', row);
      setOpen(false);
      load();
    } catch (e) {
      Alert.alert('Could not save booking', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  return <View><Section title="Bookings" subtitle="Flights, stays and every detail in between." action={canEdit ? '+ Booking' : undefined} onAction={() => show()} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
      gap: 8,
      marginBottom: 16
    }}>{['All', 'flight', 'hotel', 'train', 'activity', 'other'].map(value => <CategoryChip key={value} label={value === 'All' ? value : value[0].toUpperCase() + value.slice(1)} selected={bookingFilter === value} onPress={() => setBookingFilter(value)} />)}</ScrollView>{loading ? <LoadingState /> : error ? <Failure error={error} retry={load} /> : items.length === 0 ? <EmptyState icon="🎫" title="No bookings saved" message="Keep flights, stays, trains and confirmations together." /> : items.filter(item => bookingFilter === "All" || item.booking_type === bookingFilter).map(item => <Pressable key={item.id} style={s.item} onPress={() => canEdit && show(item)}><View style={{
        backgroundColor: colors.surfaceMuted,
        padding: 12,
        borderRadius: 14
      }}><Icon name={bookingIcon(item.booking_type)} size={26} color={colors.secondary} /></View><View style={{
        flex: 1
      }}><Text style={s.itemTitle}>{item.provider}</Text><Text style={s.itemMeta}>{item.booking_type.replace('_', ' ')}{item.reference ? ` · ${item.reference}` : ''}</Text><Text style={{
          color: item.status === 'confirmed' ? colors.primary : colors.muted,
          fontSize: 12,
          marginTop: 4
        }}>{item.status}</Text><Text style={s.itemMeta}>{[item.departure, item.arrival].filter(Boolean).join(' → ')} {item.starts_at ?? ''}</Text></View>{item.cost ? <Text style={s.amount}>{item.currency} {Number(item.cost).toLocaleString()}</Text> : null}{canEdit ? <Pressable onPress={() => removeRow('bookings', item.id).then(load).catch(e => Alert.alert('Could not update', messageFromError(e)))}><Text style={s.delete}>✕</Text></Pressable> : null}</Pressable>)}<ModalForm visible={open} title={editing ? 'Edit booking' : 'Add booking'} onClose={() => setOpen(false)}><View style={s.wrap}>{['flight', 'train', 'hotel', 'rental_car', 'bus', 'activity', 'other'].map(value => <Pressable key={value} onPress={() => setType(value)} style={[s.pill, type === value && s.pillActive]}><Text style={[s.pillText, type === value && s.pillTextActive]}>{value.replace('_', ' ')}</Text></Pressable>)}</View><View style={s.wrap}>{["planned", "confirmed", "cancelled"].map(value => <CategoryChip key={value} label={value} selected={status === value} onPress={() => setStatus(value)} />)}</View><Field label="Provider / company" value={provider} onChangeText={setProvider} /><Field label="Booking reference" value={reference} onChangeText={setReference} /><Field label="Departure / check-in" value={from} onChangeText={setFrom} /><Field label="Arrival / check-out" value={to} onChangeText={setTo} /><Field label="Date and time" value={date} onChangeText={setDate} placeholder="2027-01-10 09:30" /><Field label={`Cost (${editing?.currency ?? trip.currency})`} value={cost} onChangeText={setCost} keyboardType="decimal-pad" /><Field label="Notes" value={notes} onChangeText={setNotes} multiline /><Button label="Save booking" loading={busy} onPress={save} /></ModalForm></View>;
}
function bookingIcon(type) {
  return {
    flight: '✈️',
    train: '🚆',
    hotel: '🏨',
    rental_car: '🚗',
    bus: '🚌',
    activity: '🎟️',
    other: '📌'
  }[type];
}
export function PackingTab({
  trip,
  canEdit
}) {
  const Alert = useDialog();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Essentials');
  const [quantity, setQuantity] = useState('1');
  const [packingFilter, setPackingFilter] = useState('All');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await workspace.packing(trip.id));
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, [trip.id]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  const packed = items.filter(i => i.is_packed).length;
  function show(item) {
    setEditing(item ?? null);
    setName(item?.name ?? '');
    setCategory(item?.category ?? 'Essentials');
    setQuantity(String(item?.quantity ?? 1));
    setOpen(true);
  }
  async function save() {
    if (!name.trim() || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 1000) {
      Alert.alert('Check packing item', 'Enter a name and a whole quantity from 1 to 1,000.');
      return;
    }
    try {
      const row = {
        trip_id: trip.id,
        name: name.trim(),
        category,
        quantity: Number(quantity),
        is_packed: editing?.is_packed ?? false
      };
      if (editing) await editRow('packing_items', editing.id, row);else await addRow('packing_items', row);
      setOpen(false);
      load();
    } catch (e) {
      Alert.alert('Could not save item', messageFromError(e));
    }
  }
  return <View><Section title="Packing checklist" subtitle={`${packed} of ${items.length} packed`} action={canEdit ? '+ Item' : undefined} onAction={() => show()} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
      gap: 8,
      marginBottom: 16
    }}>{["All", ...new Set(["Essentials", "Clothing", "Toiletries", "Other", ...items.map(i => i.category)])].map(value => <CategoryChip key={value} label={value} selected={packingFilter === value} onPress={() => setPackingFilter(value)} />)}</ScrollView>{items.length ? <View style={s.bar}><View style={[s.barFill, {
        width: `${packed / items.length * 100}%`
      }]} /></View> : null}{loading ? <LoadingState /> : error ? <Failure error={error} retry={load} /> : items.length === 0 ? <EmptyState icon="🎒" title="Your bag is empty" message="Add essentials now or ask Safar AI for optional suggestions." /> : items.filter(item => packingFilter === "All" || item.category === packingFilter).map(item => <View key={item.id} style={[s.item, item.is_packed && s.completed]}><Pressable disabled={!canEdit} onPress={() => editRow('packing_items', item.id, {
        is_packed: !item.is_packed
      }).then(load).catch(e => Alert.alert('Could not update', messageFromError(e)))} style={s.check}><Text style={s.checkText}>{item.is_packed ? '✓' : ''}</Text></Pressable><Pressable style={{
        flex: 1
      }} onPress={() => canEdit && show(item)}><Text style={s.itemTitle}>{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</Text><Text style={s.itemMeta}>{item.category}</Text></Pressable>{canEdit ? <Pressable onPress={() => removeRow('packing_items', item.id).then(load).catch(e => Alert.alert('Could not update', messageFromError(e)))}><Text style={s.delete}>Delete</Text></Pressable> : null}</View>)}<ModalForm visible={open} title={editing ? 'Edit packing item' : 'Add packing item'} onClose={() => setOpen(false)}><Field label="Item" value={name} onChangeText={setName} /><Field label="Category" value={category} onChangeText={setCategory} /><Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" /><Button label="Save item" onPress={save} /></ModalForm></View>;
}
export function NotesPhotosTab({
  trip,
  canEdit
}) {
  const Alert = useDialog();
  const {
    user
  } = useAuth();
  const [notes, setNotes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [n, p] = await Promise.all([workspace.notes(trip.id), workspace.photos(trip.id)]);
      setNotes(n);
      setPhotos(p);
      const signed = await Promise.all(p.map(async photo => {
        const {
          data
        } = await supabase.storage.from('trip-photos').createSignedUrl(photo.storage_path, 3600);
        return [photo.id, data?.signedUrl ?? ''];
      }));
      setPhotoUrls(Object.fromEntries(signed));
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, [trip.id]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  function show(note) {
    setEditing(note ?? null);
    setTitle(note?.title ?? '');
    setBody(note?.body ?? '');
    setOpen(true);
  }
  async function saveNote() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const row = {
        trip_id: trip.id,
        title: title.trim(),
        body: body.trim(),
        is_pinned: editing?.is_pinned ?? false
      };
      if (editing) await editRow('trip_notes', editing.id, row);else await addRow('trip_notes', row);
      setOpen(false);
      load();
    } catch (e) {
      Alert.alert('Could not save note', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  async function uploadPhoto() {
    if (!user || busy) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo permission required', 'Allow photo access to upload trip images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.75,
        allowsEditing: false,
        base64: true
      });
      if (result.canceled || !result.assets?.length) return;
      setBusy(true);
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error('Choose a photo smaller than 10 MB.');
      let mime = (asset.mimeType ?? 'image/jpeg').toLowerCase();
      if (mime === 'image/jpg') mime = 'image/jpeg';
      const extension = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
      }[mime];
      if (!extension) throw new Error('Choose a JPEG, PNG or WebP photo.');
      let bytes;
      if (asset.base64) {
        bytes = base64ToUint8Array(asset.base64);
      } else {
        const res = await fetch(asset.uri);
        const buffer = await res.arrayBuffer();
        bytes = new Uint8Array(buffer);
      }
      if (bytes.byteLength < 50) throw new Error('Could not read image file. Please choose another photo.');
      if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Choose a photo smaller than 10 MB.');
      const path = `${user.id}/${trip.id}/${Date.now()}.${extension}`;
      const {
        error: uploadError
      } = await supabase.storage.from('trip-photos').upload(path, bytes, {
        contentType: mime,
        upsert: false
      });
      if (uploadError) throw uploadError;
      try {
        await addRow('trip_photos', {
          trip_id: trip.id,
          storage_path: path,
          caption: null,
          uploaded_by: user.id
        });
      } catch (error) {
        await supabase.storage.from('trip-photos').remove([path]);
        throw error;
      }
      load();
    } catch (e) {
      Alert.alert('Could not upload photo', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  async function deletePhoto(photo) {
    try {
      const {
        error: storageError
      } = await supabase.storage.from('trip-photos').remove([photo.storage_path]);
      if (storageError) throw storageError;
      await removeRow('trip_photos', photo.id);
      load();
    } catch (e) {
      Alert.alert('Could not delete photo', messageFromError(e));
    }
  }
  return <View><Section title="Notes" subtitle="Addresses, reminders and trip knowledge." action={canEdit ? '+ Note' : undefined} onAction={() => show()} />{loading ? <LoadingState /> : error ? <Failure error={error} retry={load} /> : notes.length === 0 ? <EmptyState icon="📝" title="No notes yet" message="Save addresses, ideas and important reminders." /> : notes.map(note => <Pressable key={note.id} style={s.note} onPress={() => canEdit && show(note)}><Text style={s.itemTitle}>{note.is_pinned ? '📌 ' : ''}{note.title}</Text><Text style={s.noteBody} numberOfLines={4}>{note.body}</Text>{canEdit ? <Pressable onPress={() => removeRow('trip_notes', note.id).then(load).catch(e => Alert.alert('Could not update', messageFromError(e)))}><Text style={s.delete}>Delete</Text></Pressable> : null}</Pressable>)}<Section title="Photos" subtitle="Private gallery shared only with authorized trip members." action={canEdit ? '+ Photo' : undefined} onAction={uploadPhoto} /><View style={s.photoGrid}>{photos.map(photo => <Pressable key={photo.id} onLongPress={() => canEdit && Alert.alert('Delete photo?', '', [{
        text: 'Cancel'
      }, {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePhoto(photo)
      }])}>{photoUrls[photo.id] ? <Image source={{
          uri: photoUrls[photo.id]
        }} style={s.photo} /> : <View style={[s.photo, s.photoPlaceholder]}><Text>Photo</Text></View>}</Pressable>)}</View>{photos.length === 0 && !loading ? <Text style={s.subtitle}>No photos uploaded.</Text> : null}<ModalForm visible={open} title={editing ? 'Edit note' : 'Add note'} onClose={() => setOpen(false)}><Field label="Title" value={title} onChangeText={setTitle} /><Field label="Note" value={body} onChangeText={setBody} multiline style={{
        minHeight: 100
      }} /><Button label="Save note" loading={busy} onPress={saveNote} /></ModalForm></View>;
}
export function MembersTab({
  trip,
  role
}) {
  const Alert = useDialog();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const isOwner = role === 'owner';
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, i] = await Promise.all([workspace.members(trip.id), isOwner ? workspace.invitations(trip.id) : Promise.resolve([])]);
      setMembers(m);
      setInvites(i);
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, [trip.id, isOwner]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  async function invite() {
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Check the email', 'Enter a valid email or leave it empty for a shareable code.');
      return;
    }
    try {
      const created = await addRow('trip_invitations', {
        trip_id: trip.id,
        invitee_email: email.trim().toLowerCase() || null,
        role: inviteRole,
        invited_by: trip.user_id
      });
      setOpen(false);
      setEmail('');
      await Share.share({
        message: `Join “${trip.title}” in Safar with code ${created.code}. Sign in, open Join Trip, and enter the code.`
      });
      load();
    } catch (e) {
      Alert.alert('Could not create invitation', messageFromError(e));
    }
  }
  async function changeRole(member) {
    const next = member.role === 'editor' ? 'viewer' : 'editor';
    try {
      await editRow('trip_members', member.id, {
        role: next
      });
      load();
    } catch (e) {
      Alert.alert('Could not update role', messageFromError(e));
    }
  }
  return <View><Section title="Trip members" subtitle="Bring your favorite people along." action={isOwner ? '+ Invite' : undefined} onAction={() => setOpen(true)} />{loading ? <LoadingState /> : error ? <Failure error={error} retry={load} /> : <><View style={s.item}><Icon name="verified" size={28} /><View><Text style={s.itemTitle}>Trip owner</Text><Text style={s.itemMeta}>Manages sharing and trip access</Text></View></View>{members.map(member => <View key={member.id} style={s.item}><Icon name="user" size={26} /><View style={{
          flex: 1
        }}><Text style={s.itemTitle}>{member.full_name || member.email || 'Safar member'}</Text><Text style={s.itemMeta}>{member.role}</Text></View>{isOwner ? <><Pressable onPress={() => changeRole(member)}><Text style={s.tiny}>Make {member.role === 'editor' ? 'viewer' : 'editor'}</Text></Pressable><Pressable onPress={() => removeRow('trip_members', member.id).then(load).catch(e => Alert.alert('Could not update', messageFromError(e)))}><Text style={s.delete}>Remove</Text></Pressable></> : null}</View>)}</>}{isOwner ? <><Section title="Pending invitations" />{invites.filter(i => i.status === 'pending').map(inviteRow => <View key={inviteRow.id} style={s.note}><Text style={s.itemTitle}>{inviteRow.invitee_email || 'Shareable invitation'} · {inviteRow.role}</Text><Text style={s.code}>{inviteRow.code}</Text><View style={s.wrap}><Button label="Share code" variant="secondary" onPress={() => Share.share({
            message: `Join “${trip.title}” in Safar with code ${inviteRow.code}.`
          })} style={{
            flex: 1
          }} /><Button label="Revoke" variant="ghost" onPress={() => editRow('trip_invitations', inviteRow.id, {
            status: 'revoked'
          }).then(load).catch(e => Alert.alert('Could not update', messageFromError(e)))} style={{
            flex: 1
          }} /></View></View>)}</> : null}<ModalForm visible={open} title="Invite member" onClose={() => setOpen(false)}><Field label="Invitee email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" hint="If entered, only that signed-in email can accept." /><View style={s.wrap}>{['editor', 'viewer'].map(value => <Pressable key={value} onPress={() => setInviteRole(value)} style={[s.pill, inviteRole === value && s.pillActive]}><Text style={[s.pillText, inviteRole === value && s.pillTextActive]}>{value}</Text></Pressable>)}</View><Text style={s.subtitle}>Editors can change trip content. Viewers can only read it.</Text><Button label="Create & share invitation" onPress={invite} /></ModalForm></View>;
}
export function AITab({
  trip,
  canEdit
}) {
  return <View><Section title="Safar AI" subtitle="Optional assistance. Every change is previewed before it reaches your trip." /><View style={s.aiCard}><Text style={s.aiStar}>✦</Text><Text style={s.sectionTitle}>{canEdit ? 'Shape this trip through conversation' : 'Ask about this shared trip'}</Text><Text style={s.noteBody}>{canEdit ? `Request an itinerary, activities, packing ideas or budget improvements. Safar AI saves a pending proposal—not a silent edit.` : 'Viewer access can ask questions from the authorized trip context, but cannot create changes.'}</Text><View style={s.wrap}>{canEdit ? <><Text style={s.suggestion}>🗓 Itinerary proposals</Text><Text style={s.suggestion}>🎒 Packing suggestions</Text><Text style={s.suggestion}>◉ Budget ideas</Text></> : <Text style={s.suggestion}>? Trip questions</Text>}</View><Button label="Open Safar AI" onPress={() => router.push({
        pathname: '/safar-ai',
        params: {
          tripId: trip.id,
          capability: canEdit ? 'suggest_itinerary' : 'trip_question'
        }
      })} /></View></View>;
}
const s = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3
  },
  smallAction: {
    backgroundColor: colors.primary,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  smallActionText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '800'
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 13
  },
  day: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 16
  },
  dayActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  dayText: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 11
  },
  dayTextActive: {
    color: colors.surface
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    marginBottom: 9
  },
  completed: {
    opacity: 0.58
  },
  check: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkText: {
    color: colors.primary,
    fontWeight: '900'
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 14
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2
  },
  itemCost: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3
  },
  tiny: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    paddingVertical: 2
  },
  delete: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    padding: 4
  },
  metrics: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 12
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 10
  },
  metricValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4
  },
  bar: {
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: 14
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 5
  },
  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center'
  },
  amount: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900'
  },
  bigIcon: {
    fontSize: 26
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  pillText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize'
  },
  pillTextActive: {
    color: colors.surface
  },
  note: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
    marginBottom: 9
  },
  noteBody: {
    color: colors.muted,
    lineHeight: 19
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: radius.sm
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted
  },
  code: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2
  },
  aiCard: {
    backgroundColor: colors.aiSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.lg,
    padding: 16,
    gap: 13
  },
  aiStar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.ai,
    color: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 19,
    overflow: 'hidden'
  },
  suggestion: {
    backgroundColor: colors.surface,
    color: colors.ai,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 8,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '800'
  },
  suggestionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  preview: {
    marginTop: 14,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.lg,
    padding: 16,
    gap: 11
  }
});