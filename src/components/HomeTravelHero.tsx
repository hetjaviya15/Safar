import { useCallback, useMemo, useRef, useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { Animated, AppState, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { TravelPhoto } from './TravelPhoto';
import { Button } from './ui/Button';
import { colors } from '@/constants/theme';
import { travelPhotos } from '@/constants/travel-photos';
import { HOME_PHOTO_IDS, PHOTO_ROTATION_MS } from '@/utils/photo-rotation';

export function HomeTravelHero() {
  const [index, setIndex] = useState(0);
  const [stageWidth, setStageWidth] = useState(0);
  const currentIndex = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoTransition = useMemo(() => new Animated.Value(1), []);
  const [transition, setTransition] = useState<{ from: number; to: number; direction: number } | null>(null);

  /** Slide the old photo out and the new photo in, following the swipe direction. */
  const showPhoto = useCallback((nextIndex: number, direction: number) => {
    const fromIndex = currentIndex.current;
    if (nextIndex === fromIndex) return;
    photoTransition.stopAnimation();
    photoTransition.setValue(0);
    setTransition({ from: fromIndex, to: nextIndex, direction });
    currentIndex.current = nextIndex;
    setIndex(nextIndex);
    Animated.timing(photoTransition, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setTransition(null);
    });
  }, [photoTransition]);

  /** Restart the auto-advance timer. */
  const restartTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      showPhoto((currentIndex.current + 1) % HOME_PHOTO_IDS.length, 1);
    }, PHOTO_ROTATION_MS);
  }, [showPhoto]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useFocusEffect(useCallback(() => {
    const sync = (appState: string) => {
      if (appState === 'active') restartTimer();
      else stopTimer();
    };
    sync(AppState.currentState);
    const listener = AppState.addEventListener('change', sync);
    return () => { stopTimer(); listener.remove(); };
  }, [restartTimer, stopTimer]));

  function renderPhoto(photoIndex: number) {
    const id = HOME_PHOTO_IDS[photoIndex];
    const photo = travelPhotos.find(item => item.id === id)!;
    return <TravelPhoto photoId={id} style={[StyleSheet.absoluteFill, s.photoFrame]}>
      <View style={s.location}><Text style={s.locationText}>{photo.name}, {photo.country}</Text></View>
    </TravelPhoto>;
  }

  const width = stageWidth || 320;
  const outgoingStyle = transition ? {
    transform: [{ translateX: photoTransition.interpolate({ inputRange: [0, 1], outputRange: [0, -transition.direction * width] }) }],
  } : undefined;
  const incomingStyle = transition ? {
    transform: [{ translateX: photoTransition.interpolate({ inputRange: [0, 1], outputRange: [transition.direction * width, 0] }) }],
  } : undefined;
  return (
    <View style={s.hero}>
      <View style={s.photoStage} onLayout={event => setStageWidth(event.nativeEvent.layout.width)}>
        {transition ? <>
          <Animated.View style={[StyleSheet.absoluteFill, outgoingStyle]}>{renderPhoto(transition.from)}</Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, incomingStyle]}>{renderPhoto(transition.to)}</Animated.View>
        </> : renderPhoto(index)}
      </View>
      <View style={s.copy}>
        <Text style={s.eyebrow}>REAL PLACES. YOUR NEXT STORY.</Text>
        <Text style={s.title}>A little further.{`\n`}A little more you.</Text>
        <View style={s.bottom}>
          <Button label="Plan a trip" icon="next" variant="accent" onPress={() => router.push('/create-trip')} />
          <View style={s.dots}>
            {HOME_PHOTO_IDS.map((item, i) => (
              <View
                key={item}
                accessibilityLabel={`${travelPhotos.find(p => p.id === item)?.name}${i === index ? ', current photo' : ''}`}
                style={[s.dot, index === i && s.selected]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: 28, overflow: 'hidden', backgroundColor: colors.navy, marginBottom: 6 },
  photoStage: { width: '100%', aspectRatio: 1.55, minHeight: 180, overflow: 'hidden' },
  photoFrame: { justifyContent: 'flex-end' },
  location: { alignSelf: 'flex-start', margin: 16, maxWidth: '85%', padding: 8, borderRadius: 12, backgroundColor: colors.heroOverlayStrong },
  locationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  copy: { padding: 20, gap: 10 },
  eyebrow: { color: colors.onHeroMuted, fontSize: 9, letterSpacing: 1.6, fontWeight: '800' },
  title: { color: '#fff', fontSize: 26, lineHeight: 31, fontWeight: '900', letterSpacing: -0.6 },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 4 },
  dots: { flexDirection: 'row', gap: 7, paddingVertical: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF66' },
  selected: { width: 20, backgroundColor: colors.accent },
});
