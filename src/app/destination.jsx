import { router, useLocalSearchParams } from 'expo-router';
import { TravelPhoto } from '@/components/TravelPhoto';
import { curatedPhoto } from '@/constants/travel-photos';
import { useEffect, useMemo, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CategoryChip } from '@/components/ui/SafarUI';
import { AddPlaceToTrip } from '@/components/AddPlaceToTrip';
import { TravelMap } from '@/components/TravelMap';
import { useDialog } from '@/components/ui/CustomModal';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { guides, hasCoordinates, parseDestination, directionsUrl } from '@/services/places';
import { loadDestinationInfo } from '@/services/destination-info';
import { messageFromError } from '@/utils/errors';
export default function DestinationScreen() {
  const {
    data
  } = useLocalSearchParams();
  const destination = useMemo(() => parseDestination(data), [data]);
  const [tab, setTab] = useState('Overview');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useDialog();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState('');
  useEffect(() => {
    if (!destination) return;
    let active = true;
    setSaved(false);
    supabase.from('saved_destinations').select('id').eq('place_id', destination.placeId).maybeSingle().then(({
      data
    }) => {
      if (active) setSaved(!!data);
    });
    return () => {
      active = false;
    };
  }, [destination]);
  useEffect(() => {
    if (!destination) return;
    const controller = new AbortController();
    let active = true;
    setInfo(null);
    setLoading(true);
    setError('');
    setSelected(destination.placeId);
    loadDestinationInfo(destination, controller.signal).then(result => {
      if (active) {
        setInfo(result);
        setError(result.warning ?? '');
      }
    }).catch(e => {
      if (active) setError(messageFromError(e));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [destination, retry]);
  if (!destination) return <Screen><Text>Destination unavailable</Text><Button label="Explore destinations" onPress={() => router.replace('/explore')} /></Screen>;
  const d = destination;
  const guide = guides[d.placeId];
  const photo = curatedPhoto(d) ?? (hasCoordinates(d) ? info?.photo : undefined);
  const hero = photo?.url;
  const points = [...(hasCoordinates(d) ? [{
    id: d.placeId,
    name: d.name,
    latitude: d.latitude,
    longitude: d.longitude,
    detail: d.displayName
  }] : []), ...(info?.nearby ?? []).map(p => ({
    id: p.id,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    detail: p.detail
  })), ...(guide?.highlights ?? []).map(p => ({
    id: p.name,
    ...p
  }))];
  const current = points.find(p => p.id === selected) ?? points[0];
  async function openLink(url) {
    try {
      await Linking.openURL(url);
    } catch {
      dialog.alert('Could not open link', 'Check your connection and try again.');
    }
  }
  function openMap() {
    router.push({
      pathname: '/map',
      params: {
        data: JSON.stringify(d)
      }
    });
  }
  async function toggleSave() {
    setBusy(true);
    try {
      const {
        data: auth,
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error('Sign in required.');
      // Dynamic provider photos are shown with their attribution here. Do not
      // persist unattributed URLs into legacy trip-cover fields.
      const result = saved ? await supabase.from('saved_destinations').delete().eq('user_id', auth.user.id).eq('place_id', d.placeId) : await supabase.from('saved_destinations').upsert({
        user_id: auth.user.id,
        place_id: d.placeId,
        name: d.name,
        display_name: d.displayName,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        image_url: d.imageUrl ?? null
      }, {
        onConflict: 'user_id,place_id'
      });
      if (result.error) throw result.error;
      setSaved(!saved);
    } catch (e) {
      dialog.alert('Could not save destination', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  const heroContent = <><View style={s.shade} /><View style={s.top}><Pressable accessibilityLabel="Back to Explore" style={s.round} onPress={() => router.back()}><Icon name="back" color="#fff" /></Pressable><Pressable accessibilityLabel="View map" style={s.round} onPress={() => setTab('Map')}><Icon name="map" color="#fff" /></Pressable></View><View style={s.heroText}>{!hero ? <Icon name="pin" size={40} color="#fff" /> : null}<Text style={s.title}>{d.name}</Text><Text style={s.location}>{d.displayName}</Text>{!hero ? <Text style={s.heroNote}>{loading ? 'Finding destination photos…' : 'No verified photo available for this destination'}</Text> : null}</View></>;
  return <Screen><TravelPhoto destination={d} photo={photo} style={s.hero} showPlaceholder={false}>{heroContent}</TravelPhoto>{photo ? <PhotoCredit photo={photo} onOpen={openLink} /> : null}

    <View style={s.tags}>{[d.category, d.country].filter(Boolean).map(tag => <Text key={tag} style={s.tag}>{tag}</Text>)}</View>
    {loading ? <View style={s.loading}><ActivityIndicator color={colors.primary} /><Text style={s.copy}>Loading local photos & travel notes…</Text></View> : null}
    {error ? <View style={s.panel}><Text style={s.copy}>{error}</Text><Button label="Retry destination information" variant="ghost" onPress={() => setRetry(v => v + 1)} /></View> : null}
    <View style={s.actions}><Button label={saved ? 'Saved' : 'Save'} icon="heart" variant="secondary" loading={busy} onPress={toggleSave} style={{
        flex: 1
      }} /><Button label="Plan a Trip" icon="plus" style={{
        flex: 2
      }} onPress={() => router.push({
        pathname: '/create-trip',
        params: {
          destination: JSON.stringify(d)
        }
      })} /></View>
    <View style={s.tabs}>{['Overview', 'Things to do', 'Best time', 'Map'].map(t => <CategoryChip key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />)}</View>
    {tab === 'Overview' ? <View style={s.panel}><Text style={s.heading}>Discover {d.name}</Text><Text style={s.copy}>{info?.overview || guide?.overview || 'Explore the map and nearby places, then build your own itinerary. Detailed travel notes are not available for this destination yet.'}</Text>{info?.sourceUrl ? <Pressable onPress={() => openLink(info.sourceUrl)}><Text style={s.link}>Read more on Wikipedia · CC BY-SA</Text></Pressable> : null}</View> : null}
    {tab === 'Best time' ? <View style={[s.panel, {
      backgroundColor: colors.cream
    }]}><Icon name="calendar" color={colors.warning} /><Text style={s.heading}>Seasons & when to visit</Text><Text style={s.copy}>{info?.bestTime || guide?.bestTime || (loading ? 'Finding local seasonal guidance…' : 'No verified seasonal guide was found for this exact location. Check the local climate and your intended activities before choosing dates.')}</Text>{info?.seasonSource ? <Pressable onPress={() => openLink(info.seasonSource)}><Text style={s.link}>Wikivoyage travel guide · CC BY-SA</Text></Pressable> : <Button label="Find a travel guide" variant="secondary" onPress={() => openLink('https://en.wikivoyage.org/w/index.php?search=' + encodeURIComponent(d.displayName))} />}</View> : null}
    {tab === 'Map' ? <View style={{
      gap: 14
    }}>{points.length ? <><TravelMap points={points} selected={selected} onSelect={setSelected} /><View style={s.tabs}>{points.map(p => <CategoryChip key={p.id} label={p.name} selected={current?.id === p.id} onPress={() => setSelected(p.id)} />)}</View>{current ? <Button icon="map" label={`Directions to ${current.name}`} onPress={() => openLink(`https://www.google.com/maps/dir/?api=1&destination=${current.latitude},${current.longitude}`)} /> : null}<Button label="Open full map" variant="secondary" onPress={openMap} /></> : <View style={s.panel}><Text style={s.copy}>This custom destination has no coordinates. Choose a search suggestion to place a pin, or search its name in Maps.</Text><Button label="Search in Maps" onPress={() => openLink(directionsUrl(d.name, d.displayName))} /></View>}</View> : null}
    {tab === 'Things to do' || tab === 'Overview' ? <View style={{
      gap: 12,
      marginTop: 18
    }}><Text style={s.heading}>Places near {d.name}</Text>{(info?.nearby ?? []).map(p => <View key={p.id} style={s.placeCard}><Pressable onPress={() => {
          setSelected(p.id);
          setTab('Map');
        }}><TravelPhoto photo={p.photo} style={s.placeImage} /><View style={s.placeCopy}><Text style={s.heading}>{p.name}</Text><Text style={s.copy}>{p.detail}</Text><Text style={s.link}>See on map →</Text></View></Pressable><View style={{
          paddingHorizontal: 14,
          paddingBottom: 14,
          gap: 10
        }}>{p.photo ? <PhotoCredit photo={p.photo} onOpen={openLink} /> : null}<AddPlaceToTrip place={p} /></View></View>)}{!info?.nearby.length ? guide?.highlights.map(p => <Pressable key={p.name} style={s.panel} onPress={() => {
        setSelected(p.name);
        setTab('Map');
      }}><Text style={s.heading}>{p.name}</Text><Text style={s.copy}>{p.detail}</Text><Text style={s.link}>See on map →</Text></Pressable>) : null}{!loading && !info?.nearby.length && !guide ? <View style={s.panel}><Text style={s.copy}>No nearby place articles were found. You can still explore the map and add your own stops.</Text><Button label="Explore map" variant="secondary" onPress={() => setTab('Map')} /></View> : null}<Text style={s.caption}>Nearby places and descriptions: Wikipedia contributors, CC BY-SA. Coverage varies; this is not a ranked list. Confirm opening hours and access before visiting.</Text></View> : null}
  </Screen>;
}
function PhotoCredit({
  photo,
  onOpen
}) {
  if (photo.provider === 'Unsplash' && photo.creditUrl) return <Text style={s.caption}>Photo by <Text accessibilityRole="link" style={s.link} onPress={() => onOpen(photo.creditUrl)}>{photo.credit}</Text> on <Text accessibilityRole="link" style={s.link} onPress={() => onOpen(photo.sourceUrl)}>Unsplash</Text> · Unsplash License</Text>;
  const provider = photo.provider ?? 'Wikimedia Commons';
  return <Pressable accessibilityLabel="Photo attribution and license" onPress={() => onOpen(photo.sourceUrl)}><Text style={s.caption}>Photo: {photo.credit} · {photo.license} · {provider} ↗</Text></Pressable>;
}
const s = StyleSheet.create({
  hero: {
    height: 300,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: colors.primary
  },
  shade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.heroOverlay
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16
  },
  round: {
    backgroundColor: colors.overlay,
    padding: 10,
    borderRadius: 24
  },
  heroText: {
    padding: 22,
    gap: 6
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff'
  },
  location: {
    color: '#fff',
    lineHeight: 20
  },
  heroNote: {
    color: colors.onHeroMuted,
    fontSize: 11
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginVertical: 16
  },
  tag: {
    backgroundColor: colors.peachSoft,
    color: colors.terracotta,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    fontWeight: '700'
  },
  copy: {
    color: colors.muted,
    lineHeight: 22
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
  },
  panel: {
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  caption: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 7
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 19
  },
  loading: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  placeCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden'
  },
  placeImage: {
    height: 170,
    width: '100%'
  },
  placeCopy: {
    padding: 16,
    gap: 8
  }
});