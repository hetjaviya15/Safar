import { HomeTravelHero } from '@/components/HomeTravelHero';
import { TravelPhoto } from '@/components/TravelPhoto';
import { destinationFromTrip } from '@/services/places';
import { getProfile } from '@/services/profile';
import { resolveAvatarUrl } from '@/services/avatar';
import { Avatar } from '@/components/ui/SafarUI';
import { DestinationSearch } from '@/components/DestinationSearch';
import { Icon } from '@/components/ui/Icon';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { BottomNav } from '@/components/BottomNav';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { colors, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { featuredDestinations } from '@/services/destinations';
import { listTrips } from '@/services/trips';
import { formatDate } from '@/utils/date';
import { messageFromError } from '@/utils/errors';

/** Airplane-icon header used on the Home screen only. */
function HomeHeader({
  name,
  avatar,
  onAvatarPress
}) {
  return <View style={styles.header}>
      <View style={styles.headerBrand}>
        <View style={styles.brandLine}>
          <Text style={styles.plane}>✈</Text>
          <Text style={styles.brand}>Safar</Text>
        </View>
        <Text style={styles.tagline}>Your journey, your way.</Text>
      </View>
      <Pressable onPress={onAvatarPress} style={styles.avatarWrap}>
        <Avatar name={name} uri={avatar} size={44} />
      </Pressable>
    </View>;
}
export default function HomeScreen() {
  const {
    user
  } = useAuth();
  const [query, setQuery] = useState('');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);else setLoading(true);
    setError('');
    try {
      const [result, photo] = await Promise.all([listTrips(), getProfile().then(p => resolveAvatarUrl(p.avatar_url)).catch(() => null)]);
      setAvatar(photo);
      setTrips(result.trips);
      setCached(result.cached);
    } catch (e) {
      setError(messageFromError(e, 'Could not load your trips.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  const name = String(user?.user_metadata.full_name ?? user?.email?.split('@')[0] ?? 'Traveler').split(' ')[0];
  const upcoming = trips.filter(t => !t.archived_at && ['upcoming', 'ongoing', 'draft'].includes(t.status)).slice(0, 3);
  return <View style={styles.root}><Screen contentStyle={styles.screenContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}>
    <HomeHeader name={name} avatar={avatar} onAvatarPress={() => router.push('/profile')} />
    <Text style={styles.hello}>Hello, {name} 👋</Text><Text style={styles.lead}>Where will your next story begin?</Text><View style={styles.searchWrap}><DestinationSearch value={query} onChangeText={setQuery} onSelect={destination => router.push({
          pathname: "/destination",
          params: {
            data: JSON.stringify(destination)
          }
        })} onSubmit={() => router.push({
          pathname: "/explore",
          params: {
            query
          }
        })} /></View>
    {cached ? <View style={styles.notice}><Text style={styles.noticeText}>Offline view · showing your last saved trips</Text></View> : null}
    <HomeTravelHero />
    <Text style={styles.sectionTitle}>Quick actions</Text><View style={styles.quickRow}><Quick icon="▣" title="My trips" onPress={() => router.push('/trips')} /><Quick icon="⌁" title="Join trip" tone="sunset" onPress={() => router.push('/join')} /><Quick icon="✦" title="Safar AI" tone="ai" onPress={() => router.push('/safar-ai')} /></View>
    <Pressable style={styles.aiBanner} onPress={() => router.push('/safar-ai')}><View style={styles.aiOrb}><Icon name="ai" color="#fff" /></View><View style={{
          flex: 1
        }}><Text style={styles.aiTitle}>Plan together with Safar AI</Text><Text style={styles.aiCopy}>Chat, review a complete trip preview, then decide what gets saved.</Text></View><Text style={styles.aiArrow}>→</Text></Pressable>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Upcoming trips</Text><Pressable onPress={() => router.push('/trips')}><Text style={styles.link}>See all</Text></Pressable></View>
    {loading ? <LoadingState label="Finding your journeys…" /> : error ? <ErrorState message={error} onRetry={() => load()} /> : upcoming.length === 0 ? <EmptyState icon="🧳" title="No trips yet" message="Create your first trip and keep the plan, budget and bookings together." actionLabel="Create a trip" onAction={() => router.push('/create-trip')} /> : upcoming.map(trip => <TripPreview key={trip.id} trip={trip} />)}
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Travel inspiration</Text><Pressable onPress={() => router.push('/explore')}><Text style={styles.link}>Discover</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>{featuredDestinations.slice(0, 4).map(destination => <Pressable key={destination.placeId} style={({
          pressed
        }) => [styles.destination, pressed && styles.pressed]} onPress={() => router.push({
          pathname: '/destination',
          params: {
            data: JSON.stringify(destination)
          }
        })}><TravelPhoto destination={destination} style={styles.destinationImage} /><View style={styles.gradientCopy}><Text style={styles.destinationName}>{destination.name}</Text><Text style={styles.destinationCountry}>{destination.country}</Text></View></Pressable>)}</ScrollView>
  </Screen><BottomNav /></View>;
}
function Quick({
  icon,
  title,
  onPress,
  tone = 'brand'
}) {
  const tint = tone === 'ai' ? colors.ai : tone === 'sky' ? colors.secondary : tone === 'sunset' ? colors.terracotta : colors.primary;
  return <Pressable style={({
    pressed
  }) => [styles.quick, {
    backgroundColor: tone === 'ai' ? colors.aiSoft : tone === 'sunset' ? colors.peachSoft : colors.surfaceMuted
  }, pressed && styles.pressed]} onPress={onPress}><Icon name={icon} color={tint} size={25} /><Text style={styles.quickTitle}>{title}</Text></Pressable>;
}
function TripPreview({
  trip
}) {
  return <Pressable style={({
    pressed
  }) => [styles.trip, pressed && styles.pressed]} onPress={() => router.push(`/trip/${trip.id}`)}><TravelPhoto destination={destinationFromTrip(trip)} style={styles.tripImage} /><View style={styles.tripCopy}><View style={styles.tripStatusRow}><Text style={styles.tripStatus}>{trip.status}</Text><Text style={styles.tripPeople}>{trip.travelers} traveler{trip.travelers === 1 ? '' : 's'}</Text></View><Text style={styles.tripTitle}>{trip.title}</Text><Text style={styles.tripMeta}>⌖ {trip.destination}</Text><Text style={styles.tripMeta}>{formatDate(trip.start_date)}</Text></View><Text style={styles.chevron}>›</Text></Pressable>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  // ---- Home header with airplane icon ----
  screenContent: {
    paddingTop: 6,
    paddingHorizontal: 18
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  headerBrand: {
    alignItems: 'flex-start',
    gap: 0
  },
  brandLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  plane: {
    color: colors.primary,
    fontSize: 35,
    lineHeight: 38
  },
  brand: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.6
  },
  tagline: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 18,
    marginTop: -1
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 0
  },
  // ---- rest of home ----
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: 18
  },
  hello: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
    transform: [{
      translateY: 10
    }]
  },
  lead: {
    color: colors.muted,
    marginTop: 2,
    marginBottom: 8
  },
  searchWrap: {
    marginBottom: 10
  },
  notice: {
    backgroundColor: colors.warningSoft,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 14
  },
  noticeText: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 12
  },
  hero: {
    borderRadius: 26,
    padding: 20,
    minHeight: 190,
    overflow: 'hidden',
    justifyContent: 'flex-end'
  },
  heroImage: {
    borderRadius: 26
  },
  heroShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.heroOverlay
  },
  heroCopy: {
    gap: 10,
    zIndex: 1,
    maxWidth: 285
  },
  eyebrow: {
    color: colors.onHero,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900'
  },
  heroBody: {
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 19
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    minHeight: 46
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 8
  },
  sectionHeadTitle: {},
  link: {
    color: colors.primary,
    fontWeight: '800'
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  quick: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    padding: 14,
    gap: 6,
    ...shadow
  },
  pressed: {
    opacity: 0.86
  },
  quickIcon: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '900'
  },
  quickTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800'
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.aiSoft,
    borderWidth: 1,
    borderColor: colors.lavenderBorder,
    borderRadius: radius.lg,
    padding: 15,
    marginTop: 14
  },
  aiOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center'
  },
  aiOrbText: {
    color: '#fff',
    fontSize: 19
  },
  aiTitle: {
    color: colors.text,
    fontWeight: '900'
  },
  aiCopy: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3
  },
  aiArrow: {
    color: colors.ai,
    fontSize: 22,
    fontWeight: '900'
  },
  trip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow
  },
  tripImage: {
    width: 82,
    height: 94,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted
  },
  tripCopy: {
    flex: 1,
    marginLeft: 12,
    gap: 4
  },
  tripStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  tripStatus: {
    color: colors.primary,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  tripPeople: {
    color: colors.muted,
    fontSize: 10
  },
  tripTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  tripMeta: {
    color: colors.muted,
    fontSize: 12
  },
  chevron: {
    color: colors.primary,
    fontSize: 28
  },
  destinationRow: {
    gap: 12
  },
  destination: {
    width: 190,
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.border,
    ...shadow
  },
  destinationImage: {
    width: '100%',
    height: '100%'
  },
  gradientCopy: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.heroPanel,
    padding: 12
  },
  destinationName: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {
      width: 0,
      height: 1
    },
    textShadowRadius: 4
  },
  destinationCountry: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 15,
    marginTop: -1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {
      width: 0,
      height: 1
    },
    textShadowRadius: 4
  }
});