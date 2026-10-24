import { TravelPhoto } from '@/components/TravelPhoto';
import { destinationFromTrip } from '@/services/places';
import { Icon } from './Icon';
import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Text, TextInput } from '@/components/ui/Typography';
import { Image as ExpoImage } from 'expo-image';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, type TextInputProps, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import type { Destination, Trip } from '@/types/models';
import { formatDate } from '@/utils/date';

type ButtonProps = { label: string; onPress: () => void; icon?: string; tone?: 'brand' | 'ai' | 'sky' | 'sunset' | 'accent'; disabled?: boolean; loading?: boolean; style?: ViewStyle };
export function SafarButton({ label, onPress, icon, tone = 'brand', disabled, loading, style }: ButtonProps) {
  const backgroundColor = tone === 'accent' ? colors.accent : tone === 'ai' ? colors.ai : tone === 'sky' ? colors.secondary : tone === 'sunset' ? colors.accentStrong : colors.primary;
  const foreground = tone === 'accent' ? colors.onAccent : colors.surface;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [ui.button, { backgroundColor }, (disabled || loading) && ui.disabled, pressed && ui.pressed, style]}>{loading ? <ActivityIndicator color={foreground} /> : <>{icon ? <Icon name={icon} color={foreground} size={20} /> : null}<Text style={[ui.buttonLabel, { color: foreground }]}>{label}</Text></>}</Pressable>;
}
export const GradientButton = SafarButton;

export function IconButton({ icon, label, onPress, tone = 'brand' }: { icon: string; label: string; onPress: () => void; tone?: ButtonProps['tone'] }) {
  const color = tone === 'ai' ? colors.ai : tone === 'sky' ? colors.secondary : tone === 'sunset' ? colors.accentStrong : colors.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[ui.iconButton, { backgroundColor: `${color}18` }]}><Icon name={icon} color={color} /></Pressable>;
}

export function ScreenContainer({ children, scroll = true, style }: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle }>) {
  const insets = useSafeAreaInsets();
  const content = <View style={[ui.screenContent, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom + 94, 110) }, style]}>{children}</View>;
  return <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>{scroll ? <ScrollView style={ui.screen} contentContainerStyle={ui.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>{content}</ScrollView> : <View style={ui.screen}>{content}</View>}</KeyboardAvoidingView>;
}

export function AppHeader({ title, subtitle, left, right }: { title: string; subtitle?: string; left?: ReactNode; right?: ReactNode }) {
  return <View style={ui.header}>{left}<View style={ui.headerCopy}><Text style={ui.headerTitle}>{title}</Text>{subtitle ? <Text style={ui.headerSubtitle}>{subtitle}</Text> : null}</View>{right}</View>;
}

export function FormField(props: TextInputProps & { label?: string; icon?: string; error?: string }) {
  return <View style={ui.fieldGroup}>{props.label ? <Text style={ui.fieldLabel}>{props.label}</Text> : null}<View style={[ui.field, props.error && ui.fieldError]}>{props.icon ? <Icon name={props.icon} size={20} /> : null}<TextInput {...props} placeholderTextColor={colors.placeholder} style={[ui.fieldInput, props.multiline && ui.fieldMultiline, props.style]} /></View>{props.error ? <Text style={ui.errorText}>{props.error}</Text> : null}</View>;
}

export function PasswordField(props: Omit<React.ComponentProps<typeof FormField>, 'secureTextEntry'> & { visible: boolean; onToggle: () => void }) {
  const { visible, onToggle, ...rest } = props;
  return <View><FormField {...rest} secureTextEntry={!visible} /><Pressable accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={onToggle} style={ui.passwordToggle}><Text style={ui.passwordToggleText}>{visible ? 'Hide' : 'Show'}</Text></Pressable></View>;
}

export function SearchBar({ value, onChangeText, onSubmit, placeholder = 'Search destinations' }: { value: string; onChangeText: (value: string) => void; onSubmit: () => void; placeholder?: string }) {
  return <View style={ui.search}><Icon name="search" /><TextInput value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit} returnKeyType="search" placeholder={placeholder} placeholderTextColor={colors.placeholder} style={ui.searchInput} /><Pressable onPress={onSubmit} style={ui.searchAction}><Text style={ui.searchActionText}>Search</Text></Pressable></View>;
}

export function CategoryChip({ label, icon, selected, onPress, tone = 'brand' }: { label: string; icon?: string; selected?: boolean; onPress: () => void; tone?: ButtonProps['tone'] }) {
  const color = tone === 'ai' ? colors.ai : tone === 'sky' ? colors.secondary : tone === 'sunset' ? colors.accentStrong : colors.primary;
  return <Pressable onPress={onPress} style={[ui.chip, selected && { backgroundColor: color, borderColor: color }]}>{icon ? <Icon name={icon} size={17} color={selected ? "#fff" : color} /> : null}<Text style={[ui.chipText, selected && ui.chipTextActive]}>{label}</Text></Pressable>;
}

export function DestinationCard({ destination, onPress, action }: { destination: Destination; onPress: () => void; action?: ReactNode }) {
  return <Pressable onPress={onPress} style={ui.destinationCard}><TravelPhoto destination={destination} style={ui.destinationImage} /><View pointerEvents="none" style={ui.destinationShade} /><View style={ui.destinationCopy}><Text style={ui.destinationName}>{destination.name}</Text><Text style={ui.destinationPlace} numberOfLines={2}>{destination.country ?? destination.displayName}</Text></View>{action}</Pressable>;
}

export function TripCard({ trip, onPress }: { trip: Trip; imageUrl?: string | null; onPress: () => void }) {
  return <Pressable onPress={onPress} style={ui.tripCard}><TravelPhoto destination={destinationFromTrip(trip)} style={ui.tripImage} /><View style={ui.tripCopy}><View style={ui.tripTop}><Text style={ui.tripStatus}>{trip.archived_at ? 'ARCHIVED' : trip.status.toUpperCase()}</Text>{trip.member_role && trip.member_role !== 'owner' ? <PermissionBadge role={trip.member_role} /> : null}</View><Text style={ui.tripTitle}>{trip.title}</Text><Text style={ui.tripMeta} numberOfLines={2}>⌖ {trip.destination}</Text><Text style={ui.tripMeta}>{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</Text></View><Text style={ui.tripChevron}>›</Text></Pressable>;
}

export function ProgressIndicator({ step, total, labels }: { step: number; total: number; labels?: string[] }) {
  return <View><View style={ui.progressRow}>{Array.from({ length: total }).map((_, index) => <View key={index} style={ui.progressSlot}><View style={[ui.progressDot, index <= step && ui.progressDotActive]}><Text style={[ui.progressNumber, index <= step && ui.progressNumberActive]}>{index < step ? '✓' : index + 1}</Text></View>{index < total - 1 ? <View style={[ui.progressLine, index < step && ui.progressLineActive]} /> : null}</View>)}</View>{labels?.[step] ? <Text style={ui.progressLabel}>{labels[step]}</Text> : null}</View>;
}

export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) {
  const [loadError, setLoadError] = useState(false);
  useEffect(() => { setLoadError(false); }, [uri]);
  const showImage = Boolean(uri) && !loadError;
  return showImage ? (
    <ExpoImage
      source={{ uri: uri! }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      transition={150}
      onError={() => setLoadError(true)}
    />
  ) : (
    <View style={[ui.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[ui.avatarText, { fontSize: size * 0.4 }]}>{name.trim()[0]?.toUpperCase() || 'S'}</Text>
    </View>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) { return <View style={ui.skeletonWrap}>{Array.from({ length: rows }).map((_, index) => <View key={index} style={[ui.skeleton, { width: index % 2 ? '74%' : '100%' }]} />)}</View>; }
export function EmptyState({ icon = '🧭', title, message, actionLabel, onAction }: { icon?: string; title: string; message: string; actionLabel?: string; onAction?: () => void }) { return <View style={ui.state}><Icon name={icon} size={36} /><Text style={ui.stateTitle}>{title}</Text><Text style={ui.stateMessage}>{message}</Text>{actionLabel && onAction ? <SafarButton label={actionLabel} onPress={onAction} style={ui.stateButton} /> : null}</View>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <View style={[ui.state, ui.errorState]}><Text style={ui.stateIcon}>!</Text><Text style={ui.stateTitle}>Something went wrong</Text><Text style={ui.stateMessage}>{message}</Text>{onRetry ? <SafarButton label="Try again" onPress={onRetry} style={ui.stateButton} /> : null}</View>; }

export function AIMessageBubble({ role, text }: { role: 'user' | 'assistant'; text: string }) { return <View style={[ui.message, role === 'user' ? ui.userMessage : ui.aiMessage]}>{role === 'assistant' ? <Text style={ui.aiLabel}>✦ SAFAR AI</Text> : null}<Text style={[ui.messageText, role === 'user' && ui.userMessageText]}>{text}</Text></View>; }
export function AIQuestionCard({ title, examples, onChoose }: { title: string; examples: string[]; onChoose: (value: string) => void }) { return <View style={ui.aiQuestion}><Text style={ui.aiQuestionTitle}>{title}</Text><View style={ui.aiExampleRow}>{examples.map(example => <Pressable key={example} onPress={() => onChoose(example)} style={ui.aiExample}><Text style={ui.aiExampleText}>{example}</Text></Pressable>)}</View></View>; }

export function AITripPreview({ title, destination, dates, travelers, budget, interests, onPress }: { title: string; destination: string; dates: string; travelers: number; budget?: string; interests?: string[]; onPress?: () => void }) {
  const content = <><View style={ui.aiPreviewTop}><View style={ui.aiOrb}><Text style={ui.aiOrbText}>✦</Text></View><Text style={ui.aiPreviewLabel}>TRIP PROPOSAL</Text></View><Text style={ui.aiPreviewTitle}>{title}</Text><Text style={ui.aiPreviewDestination}>⌖ {destination}</Text><View style={ui.aiPreviewGrid}><Text style={ui.aiPreviewMeta}>📅 {dates}</Text><Text style={ui.aiPreviewMeta}>👥 {travelers}</Text>{budget ? <Text style={ui.aiPreviewMeta}>◉ {budget}</Text> : null}</View>{interests?.length ? <Text style={ui.aiInterests}>{interests.join(' · ')}</Text> : null}</>;
  return onPress ? <Pressable onPress={onPress} style={ui.aiPreview}>{content}</Pressable> : <View style={ui.aiPreview}>{content}</View>;
}

export function MemberAvatar({ name, size = 36 }: { name: string; size?: number }) { return <Avatar name={name} size={size} />; }
export function PermissionBadge({ role }: { role: string }) { return <Text style={ui.permission}>{role.toUpperCase()}</Text>; }

export function BookingCard({ icon, title, meta, status, onPress }: { icon: string; title: string; meta: string; status?: string; onPress?: () => void }) { const Wrapper = onPress ? Pressable : View; return <Wrapper onPress={onPress} style={ui.infoCard}><View style={ui.infoIcon}><Icon name={icon} /></View><View style={ui.infoCopy}><Text style={ui.infoTitle}>{title}</Text><Text style={ui.infoMeta}>{meta}</Text></View>{status ? <Text style={ui.infoStatus}>{status}</Text> : null}</Wrapper>; }
export const ActivityCard = BookingCard;
export const BudgetCard = BookingCard;
export const TimelineItem = BookingCard;
export const DateSelector = BookingCard;

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, scrollContent: { flexGrow: 1 }, screenContent: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: 18 },
  button: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, ...shadow }, buttonIcon: { color: '#fff', fontSize: 17, fontWeight: '900' }, buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '900' }, disabled: { opacity: 0.48 }, pressed: { opacity: 0.84 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, iconButtonText: { fontSize: 21, fontWeight: '900' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg }, headerCopy: { flex: 1 }, headerTitle: { color: colors.text, fontSize: 26, lineHeight: 31, fontWeight: '900' }, headerSubtitle: { color: colors.muted, marginTop: 3, lineHeight: 18 },
  fieldGroup: { gap: 7 }, fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '800' }, field: { minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }, fieldError: { borderColor: colors.danger }, fieldIcon: { color: colors.primary, fontSize: 18, marginRight: 9 }, fieldInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 14 }, fieldMultiline: { minHeight: 96, textAlignVertical: 'top' }, errorText: { color: colors.danger, fontSize: 11 }, passwordToggle: { position: 'absolute', right: 14, bottom: 16 }, passwordToggleText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  search: { minHeight: 56, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingLeft: 14, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', ...shadow }, searchIcon: { color: colors.primary, fontSize: 23 }, searchInput: { flex: 1, color: colors.text, paddingHorizontal: 10, height: 54 }, searchAction: { backgroundColor: colors.primary, height: 44, marginRight: 5, paddingHorizontal: 14, borderRadius: radius.sm, justifyContent: 'center' }, searchActionText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 6 }, chipIcon: { fontSize: 15 }, chipText: { color: colors.text, fontWeight: '800', fontSize: 12 }, chipTextActive: { color: '#fff' },
  destinationCard: { width: 220, height: 190, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.accentSoft, ...shadow }, destinationImage: { width: '100%', height: '100%' }, imageFallback: { alignItems: 'center', justifyContent: 'center' }, fallbackIcon: { fontSize: 44 }, destinationShade: { position: 'absolute', inset: 0, backgroundColor: colors.heroOverlay }, destinationCopy: { position: 'absolute', left: 16, right: 16, bottom: 14 }, destinationName: { color: '#fff', fontWeight: '900', fontSize: 20 }, destinationPlace: { color: colors.onHero, fontSize: 12, marginTop: 3, lineHeight: 16 },
  tripCard: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow }, tripImage: { width: 92, height: 112, borderRadius: radius.md }, tripCopy: { flex: 1, gap: 5 }, tripTop: { flexDirection: 'row', alignItems: 'center', gap: 7 }, tripStatus: { color: colors.primary, backgroundColor: colors.accentSoft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, fontSize: 9, fontWeight: '900' }, tripTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, tripMeta: { color: colors.muted, fontSize: 12, lineHeight: 16 }, tripChevron: { color: colors.primary, fontSize: 28 },
  progressRow: { flexDirection: 'row', alignItems: 'center' }, progressSlot: { flex: 1, flexDirection: 'row', alignItems: 'center' }, progressDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, progressDotActive: { backgroundColor: colors.primary, borderColor: colors.primary }, progressNumber: { color: colors.muted, fontSize: 10, fontWeight: '900' }, progressNumberActive: { color: '#fff' }, progressLine: { flex: 1, height: 2, backgroundColor: colors.border }, progressLineActive: { backgroundColor: colors.accent }, progressLabel: { color: colors.primary, textAlign: 'center', fontSize: 12, fontWeight: '900', marginTop: 7 },
  avatar: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontWeight: '900' }, skeletonWrap: { gap: 11 }, skeleton: { height: 18, borderRadius: 9, backgroundColor: colors.border },
  state: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', padding: 24, gap: 8 }, errorState: { backgroundColor: colors.dangerSoft }, stateIcon: { fontSize: 34 }, stateTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, stateMessage: { color: colors.muted, textAlign: 'center', lineHeight: 20 }, stateButton: { marginTop: 8, alignSelf: 'stretch' },
  message: { maxWidth: '88%', borderRadius: 18, padding: 14, marginBottom: 10 }, userMessage: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 5 }, aiMessage: { alignSelf: 'flex-start', backgroundColor: colors.aiSoft, borderBottomLeftRadius: 5 }, aiLabel: { color: colors.ai, fontSize: 9, letterSpacing: 1.2, fontWeight: '900', marginBottom: 6 }, messageText: { color: colors.text, lineHeight: 21 }, userMessageText: { color: '#fff' },
  aiQuestion: { backgroundColor: colors.aiSoft, borderRadius: radius.lg, padding: 16, gap: 11 }, aiQuestionTitle: { color: colors.text, fontWeight: '900' }, aiExampleRow: { gap: 8 }, aiExample: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentBorder, padding: 11, borderRadius: radius.md }, aiExampleText: { color: colors.ai, fontWeight: '700', lineHeight: 18 },
  aiPreview: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radius.lg, padding: 17, gap: 8, ...shadow }, aiPreviewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, aiOrb: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ai, alignItems: 'center', justifyContent: 'center' }, aiOrbText: { color: '#fff' }, aiPreviewLabel: { color: colors.ai, letterSpacing: 1, fontSize: 10, fontWeight: '900' }, aiPreviewTitle: { color: colors.text, fontSize: 21, fontWeight: '900' }, aiPreviewDestination: { color: colors.ai, fontWeight: '700' }, aiPreviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, aiPreviewMeta: { color: colors.muted, fontSize: 12 }, aiInterests: { color: colors.text, fontSize: 12, lineHeight: 18 }, permission: { color: colors.ai, backgroundColor: colors.aiSoft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, fontSize: 9, fontWeight: '900' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 13, gap: 12 }, infoIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, infoIconText: { fontSize: 20 }, infoCopy: { flex: 1 }, infoTitle: { color: colors.text, fontWeight: '900' }, infoMeta: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }, infoStatus: { color: colors.primary, fontSize: 10, fontWeight: '900' },
});
