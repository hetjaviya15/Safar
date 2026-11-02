import { TravelPhoto } from '@/components/TravelPhoto';
import { CurrencyPicker, CurrencyPickerSheet } from '@/components/CurrencyPicker';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { ModalForm } from '@/components/ui/ModalForm';
import { Icon } from '@/components/ui/Icon';
import { useDialog } from '@/components/ui/CustomModal';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Pressable, StyleSheet, View } from 'react-native';
import { AITripPreview, AppHeader, EmptyState, ErrorState, IconButton, LoadingSkeleton, SafarButton, ScreenContainer } from '@/components/ui/SafarUI';
import { colors, radius, shadow } from '@/constants/theme';
import { applyAIProposal, editAIProposalDetails, getAIProposal, rejectAIProposal } from '@/services/ai';
import { messageFromError } from '@/utils/errors';
export default function AIResultScreen() {
  const Alert = useDialog();
  const {
    proposalId
  } = useLocalSearchParams();
  const [proposal, setProposal] = useState();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTravelers, setEditTravelers] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editCurrency, setEditCurrency] = useState('INR');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  function openEdit() {
    if (!proposal) return;
    const trip = proposal.proposal.trip;
    setEditTitle(trip.title ?? '');
    setEditTravelers(String(trip.travelers));
    setEditBudget(trip.budget == null ? '' : String(trip.budget));
    setEditCurrency(trip.currency || 'INR');
    setEditOpen(true);
  }
  async function saveDetails() {
    if (!proposal || busy) return;
    const count = Number(editTravelers);
    const budget = editBudget.trim() ? Number(editBudget) : null;
    if (!editTitle.trim() || !Number.isInteger(count) || count < 1 || count > 100 || budget != null && (!Number.isFinite(budget) || budget < 0)) {
      Alert.alert('Check details', 'Add a trip name, 1–100 travelers and a non-negative budget.');
      return;
    }
    setBusy(true);
    try {
      setProposal(await editAIProposalDetails(proposal, {
        title: editTitle.trim(),
        travelers: count,
        budget,
        noBudgetLimit: budget == null,
        currency: editCurrency
      }));
      setEditOpen(false);
    } catch (e) {
      Alert.alert('Could not update preview', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  const load = useCallback(async () => {
    if (!proposalId) {
      setError('Proposal ID is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setProposal(await getAIProposal(proposalId));
    } catch (e) {
      setError(messageFromError(e, 'Could not load this Safar AI proposal.'));
    } finally {
      setLoading(false);
    }
  }, [proposalId]);
  useEffect(() => {
    load();
  }, [load]);
  const grouped = useMemo(() => {
    const map = new Map();
    for (const activity of proposal?.proposal.activities ?? []) map.set(activity.dayNumber, [...(map.get(activity.dayNumber) ?? []), activity]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [proposal]);
  async function apply() {
    if (!proposal || busy) return;
    setBusy(true);
    try {
      const tripId = await applyAIProposal(proposal);
      setProposal(await getAIProposal(proposal.id));
      router.replace(`/trip/${tripId}`);
    } catch (e) {
      Alert.alert('Could not apply proposal', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  function confirmApply() {
    Alert.alert(proposal?.capability === 'create_trip_draft' ? 'Create this trip?' : 'Apply these suggestions?', 'Safar will write the reviewed items to your real trip. You can edit them manually afterwards.', [{
      text: 'Not yet',
      style: 'cancel'
    }, {
      text: 'Confirm',
      onPress: apply
    }]);
  }
  async function reject() {
    if (!proposal) return;
    try {
      await rejectAIProposal(proposal.id);
      router.back();
    } catch (e) {
      Alert.alert('Could not dismiss proposal', messageFromError(e));
    }
  }
  if (loading) return <ScreenContainer><LoadingSkeleton rows={8} /></ScreenContainer>;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={load} /></ScreenContainer>;
  if (!proposal) return <ScreenContainer><EmptyState title="Proposal unavailable" message="Return to Safar AI and create a new proposal." /></ScreenContainer>;
  const data = proposal.proposal;
  const trip = data.trip;
  const canApply = proposal.status === 'pending' && !['budget_suggestions', 'trip_question'].includes(proposal.capability);
  return <ScreenContainer style={styles.screen}>
    <AppHeader title="AI trip proposal" subtitle={proposal.status === 'pending' ? 'Preview only · nothing has been changed yet' : `Status · ${proposal.status}`} left={<IconButton icon="‹" label="Go back" tone="ai" onPress={() => router.back()} />} />
    <TravelPhoto destination={{
      placeId: proposal.id,
      name: trip.destination.split(",")[0],
      displayName: trip.destination
    }} style={styles.hero} showPlaceholder={false}><View style={styles.shade} /><View style={styles.heroCopy}><Text style={styles.preview}><Icon name="ai" size={12} color={colors.accentBorder} /> SAFAR AI · {proposal.status.toUpperCase()}</Text><Text style={styles.heroTitle}>{trip.title || `Trip to ${trip.destination}`}</Text><Text style={styles.heroPlace}>{trip.destination}</Text></View></TravelPhoto>
    <AITripPreview title={trip.title || `Trip to ${trip.destination}`} destination={trip.destination} dates={`${trip.startDate ?? 'Dates unchanged'} – ${trip.endDate ?? ''}`} travelers={trip.travelers ?? 0} budget={trip.noBudgetLimit ? 'No fixed limit' : trip.budget == null ? undefined : `${trip.currency} ${Number(trip.budget).toLocaleString()}`} interests={trip.interests} />
    <View style={styles.notice}><Text style={styles.noticeTitle}>You stay in control</Text><Text style={styles.noticeText}>This is a preview. Safar AI cannot save or overwrite trip data until you explicitly confirm below. For a new trip, you can edit its name, travelers and budget here. Ask AI again to change the destination or itinerary.</Text></View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Proposed itinerary</Text>{grouped.length ? grouped.map(([day, items]) => <View key={day} style={styles.dayCard}><View style={styles.dayBadge}><Text style={styles.dayBadgeText}>DAY {day}</Text></View>{items.map((item, index) => <View key={`${day}-${index}`} style={styles.activity}><View style={styles.timeline}><View style={styles.dot} />{index < items.length - 1 ? <View style={styles.line} /> : null}</View><View style={{
            flex: 1
          }}><Text style={styles.activityTitle}>{item.startsAt ? `${item.startsAt} · ` : ''}{item.title}</Text>{item.location ? <Text style={styles.activityMeta}>⌖ {item.location}</Text> : null}{item.notes ? <Text style={styles.activityNotes}>{item.notes}</Text> : null}{item.estimatedCost != null ? <Text style={styles.estimate}>Estimated · {trip.currency} {Number(item.estimatedCost).toLocaleString()}</Text> : null}</View></View>)}</View>) : <EmptyState icon="✦" title="No itinerary items" message="This proposal contains advice rather than activities to add." />}</View>
    {data.packingItems?.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Packing suggestions</Text><View style={styles.wrap}>{data.packingItems.map((item, index) => <Text key={`${item.name}-${index}`} style={styles.pill}>{item.name} · {item.category}</Text>)}</View></View> : null}
    {data.budgetTips?.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Budget ideas</Text>{data.budgetTips.map((tip, index) => <Text key={index} style={styles.tip}>◉ {tip}</Text>)}</View> : null}
    {data.assumptions.length ? <View style={styles.assumptions}><Text style={styles.assumptionTitle}>Important assumptions</Text>{data.assumptions.map((item, index) => <Text key={index} style={styles.assumption}>• {item}</Text>)}</View> : null}
    <View style={styles.actions}>{canApply && proposal.capability === 'create_trip_draft' ? <Button label="Edit details" icon="edit" variant="secondary" onPress={openEdit} /> : null}{canApply ? <SafarButton label={proposal.capability === 'create_trip_draft' ? 'Create this trip' : 'Apply approved suggestions'} icon="✓" tone="ai" loading={busy} onPress={confirmApply} /> : null}{proposal.status === 'applied' && proposal.resulting_trip_id ? <SafarButton label="Open saved trip" icon="→" onPress={() => router.replace(`/trip/${proposal.resulting_trip_id}`)} /> : null}{proposal.status === 'pending' ? <Pressable onPress={reject} style={styles.cancel}><Text style={styles.cancelText}>{proposal.trip_id ? 'Keep original' : 'Cancel proposal'}</Text></Pressable> : null}</View>
    <ModalForm visible={editOpen} title="Edit preview details" onClose={() => !busy && setEditOpen(false)}><Field label="Trip name" value={editTitle} onChangeText={setEditTitle} /><Field label="Travelers" value={editTravelers} onChangeText={setEditTravelers} keyboardType="number-pad" /><Field label={`Budget (${editCurrency})`} value={editBudget} onChangeText={setEditBudget} keyboardType="decimal-pad" hint="Leave blank for no fixed limit. Changing currency clears existing estimates; no conversion is applied." /><Text style={styles.sectionTitle}>Currency</Text><CurrencyPicker value={editCurrency} onChange={value => {
        if (value !== editCurrency) {
          setEditCurrency(value);
          setEditBudget('');
        }
      }} onMore={() => setShowCurrencyPicker(true)} /><SafarButton label="Save preview" loading={busy} onPress={saveDetails} /></ModalForm>
    <CurrencyPickerSheet visible={showCurrencyPicker} value={editCurrency} onSelect={value => {
      if (value !== editCurrency) {
        setEditCurrency(value);
        setEditBudget('');
      }
    }} onClose={() => setShowCurrencyPicker(false)} />
  </ScreenContainer>;
}
const styles = StyleSheet.create({
  screen: {
    gap: 16
  },
  hero: {
    minHeight: 235,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 20,
    ...shadow
  },
  heroImage: {
    borderRadius: radius.xl
  },
  shade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.heroOverlay
  },
  heroCopy: {
    zIndex: 1
  },
  preview: {
    color: colors.accentBorder,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    marginTop: 6
  },
  heroPlace: {
    color: colors.aiSoft,
    marginTop: 5,
    fontWeight: '700'
  },
  notice: {
    backgroundColor: colors.aiSoft,
    borderRadius: radius.md,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: colors.ai
  },
  noticeTitle: {
    color: colors.ai,
    fontWeight: '900'
  },
  noticeText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  section: {
    gap: 10
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 15
  },
  dayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12
  },
  dayBadgeText: {
    color: colors.secondary,
    fontSize: 9,
    fontWeight: '900'
  },
  activity: {
    flexDirection: 'row',
    gap: 11
  },
  timeline: {
    width: 16,
    alignItems: 'center'
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.accentStrong,
    marginTop: 4
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 52,
    backgroundColor: colors.accentBorder
  },
  activityTitle: {
    color: colors.text,
    fontWeight: '900',
    lineHeight: 20
  },
  activityMeta: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 4
  },
  activityNotes: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 11
  },
  estimate: {
    color: colors.accentStrong,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 11
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  pill: {
    backgroundColor: colors.cream,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    fontSize: 11,
    overflow: 'hidden'
  },
  tip: {
    backgroundColor: colors.surfaceMuted,
    color: colors.navy,
    borderRadius: radius.md,
    padding: 12,
    lineHeight: 19,
    overflow: 'hidden'
  },
  assumptions: {
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    padding: 16,
    gap: 7
  },
  assumptionTitle: {
    color: colors.text,
    fontWeight: '900'
  },
  assumption: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  actions: {
    gap: 10
  },
  cancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '900'
  }
});