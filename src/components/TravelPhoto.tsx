import { useEffect, useState, type PropsWithChildren } from 'react';
import { Text } from '@/components/ui/Typography';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { curatedPhoto, travelPhotos, type CuratedPhoto } from '@/constants/travel-photos';
import { colors } from '@/constants/theme';
import { loadDestinationInfo, type PlacePhoto } from '@/services/destination-info';
import { hasCoordinates } from '@/services/places';
import type { Destination } from '@/types/models';
import { Icon } from './ui/Icon';
import { commonsPhotoUrls, loadPhotoFallback } from '@/services/photo-delivery';

const localPhotos: Record<string, number> = {
  manali: require('../../assets/photography/manali.jpg'),
  bali: require('../../assets/photography/bali.jpg'), paris: require('../../assets/photography/paris.jpg'),
  kyoto: require('../../assets/photography/kyoto.jpg'), zermatt: require('../../assets/photography/zermatt.jpg'),
  jaipur: require('../../assets/photography/jaipur.jpg'), 'cape-town': require('../../assets/photography/cape-town.jpg'),
};
type Props = PropsWithChildren<{ destination?: Destination; photoId?: string; photo?: PlacePhoto; style?: StyleProp<ViewStyle>; showPlaceholder?: boolean }>;
export function TravelPhoto({ destination, photoId, photo: supplied, children, style, showPlaceholder = true }: Props) {
  const known = photoId ? travelPhotos.find(p => p.id === photoId) : destination ? curatedPhoto(destination) : undefined;
  const key = destination ? JSON.stringify([destination.placeId, destination.name, destination.country, destination.latitude, destination.longitude]) : '';
  const [remote, setRemote] = useState<{ key: string; photo?: PlacePhoto }>({ key: '' });
  useEffect(() => {
    if (!destination || known || supplied || !hasCoordinates(destination)) return;
    let active = true;
    loadDestinationInfo(destination).then(info => { if (active) setRemote({ key, photo: info.photo }); }).catch(() => { if (active) setRemote({ key }); });
    return () => { active = false; };
    // key includes all location identity fields; cover URLs are intentionally not trusted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, !!known, !!supplied]);
  const photo = supplied ?? known ?? (destination?.imageUrl ? { url: destination.imageUrl, sourceUrl: destination.imageUrl, credit: 'Destination image', license: 'Provided destination image' } : undefined) ?? (remote.key === key ? remote.photo : undefined);
  const local = known && photo?.url === known.url ? localPhotos[(known as CuratedPhoto).id] : undefined;
  return <View style={[s.frame, style]}>
    {photo ? <PhotoImage key={photo.url} photo={photo} local={local} label={destination ? `Photograph of ${destination.name}` : known?.name ?? 'Travel photograph'} /> : showPlaceholder ? <View style={s.placeholder}><Icon name="mountain" size={30} color={colors.onHero} /><Text style={s.placeholderText}>{destination?.name ? `${destination.name} · photo unavailable` : 'Destination photo unavailable'}</Text></View> : null}
    {children}
  </View>;
}
function PhotoImage({ photo, local, label }: { photo: PlacePhoto; local?: number; label: string }) {
  const candidates = commonsPhotoUrls(photo.url);
  const urls = candidates.length ? candidates : [photo.url];
  const [attempt, setAttempt] = useState(0);
  const [dataUri, setDataUri] = useState('');
  const [loading, setLoading] = useState(!local);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const proxy = !local && candidates.length > 0 && attempt >= urls.length;
  const uri = proxy ? dataUri : candidates.length ? urls[Math.min(attempt, urls.length - 1)] : photo.url;
  useEffect(() => {
    if (!proxy || !candidates.length) return;
    let active = true;
    loadPhotoFallback(photo.url).then(value => { if (active) setDataUri(value); }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [proxy, photo.url, candidates.length, retry]);
  // A stalled device connection should not leave a blank rectangle indefinitely.
  useEffect(() => {
    if (!loading || local || failed) return;
    const timer = setTimeout(() => {
      if (proxy || (!candidates.length && attempt >= 2)) { setFailed(true); setLoading(false); }
      else setAttempt(value => value + 1);
    }, proxy ? 30000 : 8000);
    return () => clearTimeout(timer);
  }, [attempt, loading, local, proxy, failed, retry, candidates.length]);
  const unavailable = failed || (proxy && !candidates.length);
  return <>
    {!unavailable && (local || uri) ? <Image key={`${attempt}-${retry}`} source={local ?? { uri }} resizeMode="cover" accessibilityLabel={label} style={[StyleSheet.absoluteFill, s.image]} onLoad={() => setLoading(false)} onError={() => {
      if (local || proxy || (!candidates.length && attempt >= 2)) { setFailed(true); setLoading(false); }
      else { setLoading(true); setAttempt(value => value + 1); }
    }} /> : null}
    {unavailable ? <View style={[s.placeholder, { zIndex: 3 }]}><Pressable accessibilityRole="button" accessibilityLabel="Retry photograph" style={s.retry} onPress={event => { event.stopPropagation(); setAttempt(0); setDataUri(''); setFailed(false); setLoading(true); setRetry(value => value + 1); }}><Text style={s.placeholderText}>Photo couldn’t load · Tap to retry</Text></Pressable></View> : loading ? <View pointerEvents="none" style={[s.placeholder, { zIndex: 3 }]}><ActivityIndicator color={colors.onHero} /><Text style={s.placeholderText}>Loading photograph…</Text></View> : null}
  </>;
}
const s = StyleSheet.create({ frame: { overflow: 'hidden', backgroundColor: colors.navy }, image: { width: '100%', height: '100%' }, retry: { backgroundColor: colors.heroOverlayStrong, padding: 12, borderRadius: 12 }, placeholder: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 }, placeholderText: { color: colors.onHero, fontSize: 10, textAlign: 'center' } });
