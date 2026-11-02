import { DestinationSearch } from '@/components/DestinationSearch';
import { TravelPhoto } from '@/components/TravelPhoto';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { BottomNav } from '@/components/BottomNav';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { colors, radius } from '@/constants/theme';
import { featuredDestinations, customDestination } from '@/services/destinations';
import { suggestDestinations } from '@/services/autocomplete';
import { curatedPhoto } from '@/constants/travel-photos';
import { loadDestinationInfo } from '@/services/destination-info';
import { supabase } from '@/lib/supabase';
const categories = ['All', 'Saved', 'Beach', 'Mountains', 'Adventure', 'Nature', 'Cities', 'Culture', 'Food'];
export default function ExploreScreen() {
  const params = useLocalSearchParams();
  const initialCategory = categories.includes(params.category ?? '') ? params.category : 'All';
  const [query, setQuery] = useState(params.query ?? '');
  const [category, setCategory] = useState(initialCategory);
  const [results, setResults] = useState(initialCategory === 'All' ? featuredDestinations : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [remotePhotos, setRemotePhotos] = useState({});
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    for (const destination of featuredDestinations) {
      if (destination.imageUrl || curatedPhoto(destination)) continue;
      loadDestinationInfo(destination).then(info => {
        if (active && info.photo) setRemotePhotos(current => ({
          ...current,
          [destination.placeId]: info.photo
        }));
      }).catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, []);
  useFocusEffect(useCallback(() => {
    if (query.trim()) return;
    if (category === 'Saved') {
      let active = true;
      setLoading(true);
      supabase.from('saved_destinations').select('*').order('created_at', {
        ascending: false
      }).then(({
        data,
        error: savedError
      }) => {
        if (!active) return;
        if (savedError) setError('Could not load saved destinations. Please check your connection and try again.');else {
          setError('');
          setResults((data ?? []).map(row => ({
            placeId: row.place_id,
            name: row.name,
            displayName: row.display_name,
            latitude: row.latitude ?? undefined,
            longitude: row.longitude ?? undefined,
            imageUrl: row.image_url ?? undefined
          })));
        }
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }
    setResults(category === 'All' ? featuredDestinations : featuredDestinations.filter(d => d.category === category));
    setError('');
  }, [query, category]));
  async function runSearch() {
    if (query.trim().length < 3 || loading) return;
    const token = ++request.current;
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const found = await suggestDestinations(query);
      if (token === request.current) setResults(found);
    } catch (searchError) {
      if (token === request.current) setError(searchError instanceof Error ? searchError.message : 'Search unavailable.');
    } finally {
      if (token === request.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!params.query?.trim()) return;
    let active = true;
    const token = ++request.current;
    setQuery(params.query);
    setLoading(true);
    setSearched(true);
    setError('');
    suggestDestinations(params.query).then(found => {
      if (active && token === request.current) setResults(found);
    }).catch(e => {
      if (active && token === request.current) setError(e.message);
    }).finally(() => {
      if (active && token === request.current) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [params.query]);
  function clearSearch() {
    request.current++;
    setLoading(false);
    setQuery('');
    setSearched(false);
    setError('');
    setResults(category === 'All' ? featuredDestinations : featuredDestinations.filter(item => item.category === category));
  }
  return <View style={{
    flex: 1
  }}><Screen><Text style={styles.title}>Explore the world</Text><Text style={styles.subtitle}>Search cities, villages, islands, regions and landmarks worldwide.</Text><DestinationSearch value={query} onChangeText={value => {
        request.current++;
        setLoading(false);
        setQuery(value);
        setSearched(false);
        setResults([]);
        setError('');
      }} onSubmit={runSearch} onSelect={destination => router.push({
        pathname: "/destination",
        params: {
          data: JSON.stringify(destination)
        }
      })} />
    <View style={styles.chips} accessibilityLabel="Destination categories">{categories.map(item => <Pressable key={item} onPress={() => {
          clearSearch();
          setCategory(item);
        }} style={({
          pressed
        }) => [styles.chip, category === item && styles.chipActive, pressed && styles.chipPressed]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
    {loading ? <LoadingState label="Searching the map…" /> : query.trim() && !searched ? <View style={styles.searchPrompt}><Text style={styles.promptTitle}>Ready when you are</Text><Text style={styles.manual}>Choose a live suggestion above, or press Search to see more results.</Text></View> : error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Text style={styles.manual}>You can always use custom location entry while creating a trip.</Text></View> : !query.trim() && category === 'All' ? <>
      <Text style={styles.section}>Featured destinations</Text>
      <View style={styles.grid}>{featuredDestinations.filter(destination => destination.imageUrl || curatedPhoto(destination) || remotePhotos[destination.placeId]).map(destination => <DestinationRow key={destination.placeId} destination={destination} photo={remotePhotos[destination.placeId]} compact />)}</View>
    </> : <><Text style={styles.section}>{query ? 'Search results' : category}</Text>{results.length === 0 ? <EmptyState title="No exact match" message="Try a wider region, check spelling, or enter this as a custom destination in Create Trip." /> : <View style={styles.grid}>{results.map(destination => <DestinationRow key={destination.placeId} destination={destination} compact={!query} />)}</View>}</>}
{query.trim().length >= 2 ? <Button label={`Plan “${query.trim()}” as a custom destination`} variant="secondary" onPress={() => router.push({
        pathname: "/destination",
        params: {
          data: JSON.stringify(customDestination(query))
        }
      })} /> : null}
  </Screen><BottomNav /></View>;
}
function DestinationRow({
  destination,
  compact,
  photo
}) {
  const content = <><View style={styles.imageShade} /><View style={[styles.copy, compact && {
      padding: 12
    }]}><View style={{
        flex: 1
      }}>{!compact && destination.category ? <Text style={styles.category}>{destination.category}</Text> : null}<Text numberOfLines={2} style={[styles.name, compact && styles.compactName]}>{destination.name}</Text><Text style={[styles.place, compact && styles.compactPlace]} numberOfLines={compact ? 1 : 2}>{compact ? destination.country ?? destination.displayName.split(',').pop()?.trim() : destination.displayName}</Text>{photo?.provider === 'Unsplash' && photo.creditUrl ? <Text style={styles.photoCredit}>Photo by <Text accessibilityRole="link" style={styles.photoCreditLink} onPress={event => {
            event.stopPropagation();
            Linking.openURL(photo.creditUrl).catch(() => undefined);
          }}>{photo.credit}</Text> on <Text accessibilityRole="link" style={styles.photoCreditLink} onPress={event => {
            event.stopPropagation();
            Linking.openURL(photo.sourceUrl).catch(() => undefined);
          }}>Unsplash</Text></Text> : null}</View>{!compact ? <View style={styles.arrowCircle}><Icon name="chevron-right" /></View> : null}</View></>;
  return <Pressable style={({
    pressed
  }) => [styles.card, compact && styles.gridCard, !compact && {
    width: '100%'
  }, pressed && styles.cardPressed]} onPress={() => router.push({
    pathname: '/destination',
    params: {
      data: JSON.stringify(destination)
    }
  })}><TravelPhoto destination={destination} photo={photo} style={styles.image}>{content}</TravelPhoto></Pressable>;
}
const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  title: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: 14,
    overflow: 'hidden'
  },
  searchIcon: {
    color: colors.primary,
    fontSize: 24
  },
  searchInput: {
    flex: 1,
    height: 52,
    marginLeft: 8,
    color: colors.text
  },
  clear: {
    color: colors.muted,
    padding: 8
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
    marginTop: 6
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 14
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 13,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipPressed: {
    opacity: 0.76
  },
  chipText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12
  },
  chipTextActive: {
    color: colors.surface
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4
  },
  section: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 12
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 13,
    overflow: 'hidden'
  },
  gridCard: {
    width: '48%'
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{
      scale: 0.99
    }]
  },
  image: {
    height: 190,
    justifyContent: 'flex-end'
  },
  cardImage: {
    borderRadius: radius.lg
  },
  imageShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.heroPanel
  },
  placeholder: {
    backgroundColor: colors.primary,
    overflow: 'hidden'
  },
  pin: {
    position: 'absolute',
    top: 25,
    right: 28,
    color: 'rgba(255,255,255,0.22)',
    fontSize: 90
  },
  copy: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 1
  },
  name: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 5,
    textShadowColor: colors.navy,
    textShadowRadius: 5
  },
  place: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 260,
    textShadowColor: colors.navy,
    textShadowRadius: 4
  },
  photoCredit: {
    color: colors.onHeroMuted,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 4
  },
  compactName: {
    fontSize: 17,
    lineHeight: 20
  },
  compactPlace: {
    fontSize: 12,
    lineHeight: 15,
    marginTop: -1
  },
  photoCreditLink: {
    color: '#fff',
    textDecorationLine: 'underline'
  },
  category: {
    alignSelf: 'flex-start',
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    fontWeight: '800',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  arrow: {
    color: colors.primary,
    fontSize: 28,
    marginTop: -2
  },
  searchPrompt: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 18,
    gap: 5
  },
  promptTitle: {
    color: colors.primary,
    fontWeight: '900'
  },
  error: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: 18,
    gap: 6
  },
  errorText: {
    color: colors.warning,
    fontWeight: '800'
  },
  manual: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  }
});