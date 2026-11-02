import { CurrencyPicker, CurrencyPickerSheet } from '@/components/CurrencyPicker';
import { DestinationSearch } from '@/components/DestinationSearch';
import { parseDestination } from '@/services/places';
import { getProfile } from '@/services/profile';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Icon } from '@/components/ui/Icon';
import { DestinationCard } from '@/components/ui/SafarUI';
import { useDialog } from '@/components/ui/CustomModal';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Pressable, StyleSheet, ScrollView, View } from 'react-native';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { colors, radius } from '@/constants/theme';
import { customDestination, searchDestinations, featuredDestinations } from '@/services/destinations';
import { createTrip } from '@/services/trips';
import { formatDate, toDateKey, tripDuration } from '@/utils/date';
import { messageFromError } from '@/utils/errors';
const travelerTypes = ['Solo', 'Friends', 'Family', 'Group'];
const interests = ['Adventure', 'Sightseeing', 'Food', 'Nature', 'Culture', 'Shopping', 'Relaxation', 'Photography'];
const travelerIcons = {
  Solo: 'user',
  Friends: 'users',
  Family: 'home',
  Group: 'users'
};
const interestIcons = {
  Adventure: '△',
  Sightseeing: '⌖',
  Food: '◒',
  Nature: '♧',
  Culture: '◇',
  Shopping: '▣',
  Relaxation: '≈',
  Photography: '◉'
};
export default function CreateTripScreen() {
  const Alert = useDialog();
  const params = useLocalSearchParams();
  const preset = useMemo(() => parseDestination(params.destination), [params.destination]);
  const [step, setStep] = useState(preset ? 1 : 0);
  const [destination, setDestination] = useState(preset);
  const [query, setQuery] = useState(preset?.displayName ?? '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const after = new Date(tomorrow);
  after.setDate(after.getDate() + 3);
  const [startDate, setStartDate] = useState(toDateKey(tomorrow));
  const [endDate, setEndDate] = useState(toDateKey(after));
  const [travelerType, setTravelerType] = useState('Solo');
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState('');
  const [noLimit, setNoLimit] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [availableInterests, setAvailableInterests] = useState(interests);
  const [title, setTitle] = useState(preset ? `${preset.name} getaway` : '');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    getProfile().then(p => {
      if (active) {
        setCurrency(p.preferred_currency || 'INR');
        setSelectedInterests(p.travel_preferences);
        setAvailableInterests(list => [...new Set([...list, ...p.travel_preferences])]);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  async function runDestinationSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError('');
    try {
      setResults(await searchDestinations(query));
    } catch (error) {
      setSearchError(messageFromError(error));
    } finally {
      setSearching(false);
    }
  }
  function choose(item) {
    setDestination(item);
    setQuery(item.displayName);
    setResults([]);
    if (!title) setTitle(`${item.name} getaway`);
  }
  function next() {
    if (step === 0 && !destination) {
      Alert.alert('Destination required', 'Choose a search result or use your entered text as a custom location.');
      return;
    }
    if (step === 1 && (endDate < startDate || tripDuration(startDate, endDate) > 366)) {
      Alert.alert('Check the dates', 'Choose an end date on or after the start date, with at most 366 days.');
      return;
    }
    setStep(value => Math.min(5, value + 1));
  }
  async function submit() {
    if (busy) return;
    if (!destination || !title.trim()) return;
    const parsedBudget = noLimit || !budget.trim() ? null : Number(budget);
    if (!noLimit && budget.trim() && (!Number.isFinite(parsedBudget) || Number(parsedBudget) < 0)) {
      Alert.alert('Invalid budget', 'Enter a positive amount or choose No budget limit.');
      return;
    }
    const draft = {
      title: title.trim(),
      destination,
      startDate,
      endDate,
      travelerType,
      travelers,
      budget: parsedBudget,
      currency,
      noBudgetLimit: noLimit,
      interests: selectedInterests
    };
    setBusy(true);
    try {
      const trip = await createTrip(draft);
      router.replace(`/trip/${trip.id}`);
    } catch (e) {
      Alert.alert('Could not create trip', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  return <View style={{
    flex: 1
  }}><Screen><View style={styles.top}><Pressable onPress={() => step ? setStep(step - 1) : router.back()}><Text style={styles.back}>← {step ? 'Back' : 'Home'}</Text></Pressable><Text style={styles.step}>Step {step + 1} of 6</Text></View><View style={styles.progress}>{Array.from({
          length: 6
        }).map((_, i) => <View key={i} style={styles.progressSlot}><View style={[styles.progressDot, i <= step && styles.progressActive]}><Text style={[styles.progressNumber, i <= step && styles.progressNumberActive]}>{i < step ? '✓' : i + 1}</Text></View>{i < 5 ? <View style={[styles.progressLine, i < step && styles.progressLineActive]} /> : null}</View>)}</View>
    <Text style={styles.title}>{['Where are you going?', 'When is the trip?', 'Who is traveling?', 'Set your budget', 'What do you enjoy?', 'Review your trip'][step]}</Text><Text style={styles.subtitle}>{['Search worldwide or enter a custom destination.', 'Choose the start and end dates.', 'Tell us about your travel party.', 'You can update this at any time.', 'Pick any that fit this journey.', 'Confirm the details before saving.'][step]}</Text>
    <View style={styles.card}>{step === 0 ? <><DestinationSearch value={query} onChangeText={value => {
            setQuery(value);
            setDestination(null);
            setResults([]);
          }} onSelect={choose} onSubmit={runDestinationSearch} />{searching ? <Text style={styles.helper}>Searching…</Text> : null}{!query && !destination ? <><Text style={styles.label}>Popular destinations</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
              gap: 12
            }}>{featuredDestinations.map(item => <DestinationCard key={item.placeId} destination={item} onPress={() => choose(item)} />)}</ScrollView></> : null}<Text style={styles.attribution}>Search data © OpenStreetMap contributors</Text>{searchError ? <Text style={styles.warning}>{searchError}</Text> : null}{results.map(item => <Pressable key={item.placeId} style={styles.result} onPress={() => choose(item)}><Text style={styles.resultName}>{item.name}</Text><Text style={styles.resultPlace} numberOfLines={2}>{item.displayName}</Text></Pressable>)}{!destination && query.trim().length >= 2 ? <Button label={`Use “${query.trim()}” as custom location`} variant="secondary" onPress={() => choose(customDestination(query))} /> : null}{destination ? <View style={styles.selected}><Text style={styles.selectedTitle}>✓ {destination.name}</Text><Text style={styles.selectedPlace}>{destination.displayName}</Text><Pressable onPress={() => {
              setDestination(null);
              setQuery('');
            }}><Text style={styles.link}>Change destination</Text></Pressable></View> : null}</> : null}
      {step === 1 ? <DateRangePicker start={startDate} end={endDate} onChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }} /> : null}
      {step === 2 ? <><View style={styles.options}>{travelerTypes.map(item => <Choice key={item} label={item} icon={travelerIcons[item]} large selected={travelerType === item} onPress={() => {
              setTravelerType(item);
              if (item === 'Solo') setTravelers(1);else if (travelers < 2) setTravelers(2);
            }} />)}</View><Text style={styles.label}>Traveler count</Text><View style={styles.counter}><Pressable onPress={() => setTravelers(n => Math.max(travelerType === 'Solo' ? 1 : 2, n - 1))} style={styles.counterButton}><Text style={styles.counterText}>−</Text></Pressable><Text style={styles.count}>{travelers}</Text><Pressable onPress={() => setTravelers(n => Math.min(100, n + 1))} style={styles.counterButton}><Text style={styles.counterText}>+</Text></Pressable></View></> : null}
      {step === 3 ? <><Pressable style={[styles.toggle, noLimit && styles.toggleActive]} onPress={() => setNoLimit(v => !v)}><Text style={[styles.toggleText, noLimit && styles.toggleTextActive]}>✓ No budget limit</Text></Pressable>{!noLimit ? <Field label="Total budget" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="e.g. 50000" /> : null}<Text style={styles.label}>Currency</Text><CurrencyPicker value={currency} onChange={setCurrency} onMore={() => setShowCurrencyPicker(true)} /></> : null}
      {step === 4 ? <View style={styles.options}>{availableInterests.map(item => <Choice key={item} label={item} icon={interestIcons[item]} large selected={selectedInterests.includes(item)} onPress={() => setSelectedInterests(list => list.includes(item) ? list.filter(x => x !== item) : [...list, item])} />)}</View> : null}
      {step === 5 && destination ? <><Field label="Trip name" value={title} onChangeText={setTitle} maxLength={100} /><Review label="Destination" value={destination.displayName} /><Review label="Dates" value={`${formatDate(startDate)} – ${formatDate(endDate)} (${tripDuration(startDate, endDate)} days)`} /><Review label="Travelers" value={`${travelerType} · ${travelers}`} /><Review label="Budget" value={noLimit ? 'No limit' : budget ? `${currency} ${Number(budget).toLocaleString()}` : 'Not specified'} /><Review label="Interests" value={selectedInterests.join(', ') || 'None selected'} /><Text style={styles.helper}>Creating this trip does not contact Safar AI.</Text></> : null}
    </View><Button label={step === 5 ? 'Create trip' : 'Continue'} loading={busy} disabled={step === 0 && !destination || step === 5 && !title.trim()} onPress={step === 5 ? submit : next} style={styles.continue} />
  </Screen><CurrencyPickerSheet visible={showCurrencyPicker} value={currency} onSelect={setCurrency} onClose={() => setShowCurrencyPicker(false)} /><BottomNav /></View>;
}
function Choice({
  label,
  icon,
  large,
  selected,
  onPress
}) {
  return <Pressable onPress={onPress} style={[styles.choice, large && styles.choiceLarge, selected && styles.choiceActive]}>{icon ? <Icon name={label === "Photography" ? "camera" : label === "Shopping" ? "shopping" : icon} color={selected ? "#fff" : colors.primary} size={25} /> : null}<Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{label}</Text>{selected && large ? <Text style={styles.selectedCheck}>✓</Text> : null}</Pressable>;
}
function Review({
  label,
  value
}) {
  return <View style={styles.review}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value}</Text></View>;
}
const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  back: {
    color: colors.primary,
    fontWeight: '800'
  },
  step: {
    color: colors.muted,
    fontWeight: '700'
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20
  },
  progressSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressDot: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  progressNumber: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 10
  },
  progressNumberActive: {
    color: '#fff'
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border
  },
  progressLineActive: {
    backgroundColor: colors.accent
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 18,
    gap: 15
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: 12,
    overflow: 'hidden'
  },
  searchIcon: {
    color: colors.primary,
    fontSize: 23
  },
  searchInput: {
    flex: 1,
    height: 52,
    marginLeft: 8,
    color: colors.text
  },
  searchButton: {
    height: 42,
    paddingHorizontal: 12,
    marginRight: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900'
  },
  attribution: {
    color: colors.muted,
    fontSize: 10,
    marginTop: -8
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  warning: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18
  },
  result: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  resultName: {
    color: colors.text,
    fontWeight: '800'
  },
  resultPlace: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3
  },
  selected: {
    backgroundColor: colors.surfaceMuted,
    padding: 15,
    borderRadius: radius.md,
    gap: 5
  },
  selectedTitle: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 17
  },
  selectedPlace: {
    color: colors.muted,
    lineHeight: 19
  },
  link: {
    color: colors.primary,
    fontWeight: '800',
    marginTop: 5
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14
  },
  label: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13
  },
  dateText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 5
  },
  summary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 15
  },
  summaryValue: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  choiceLarge: {
    width: '48%',
    minHeight: 76,
    borderRadius: radius.md,
    justifyContent: 'center',
    flexDirection: 'column',
    position: 'relative'
  },
  choiceIcon: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900'
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 10,
    color: '#fff',
    fontWeight: '900'
  },
  choiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  choiceText: {
    color: colors.text,
    fontWeight: '700'
  },
  choiceTextActive: {
    color: colors.surface
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28
  },
  counterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center'
  },
  counterText: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center'
  },
  count: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
    minWidth: 45,
    textAlign: 'center'
  },
  toggle: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: radius.md
  },
  toggleActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary
  },
  toggleText: {
    color: colors.text,
    fontWeight: '700'
  },
  toggleTextActive: {
    color: colors.primary
  },
  review: {
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 12,
    gap: 4
  },
  reviewLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  reviewValue: {
    color: colors.text,
    fontWeight: '800',
    lineHeight: 20
  },
  continue: {
    marginTop: 16
  }
});