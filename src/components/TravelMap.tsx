import { useState } from 'react';
import { Text } from '@/components/ui/Typography';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '@/constants/theme';
export type MapPoint = { id: string; name: string; latitude: number; longitude: number; detail?: string };
export function TravelMap({ points, selected }: { points: MapPoint[]; selected?: string; onSelect: (id: string) => void }) {
  const p = points.find(point => point.id === selected) ?? points[0];
  const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  if (!p) return null;
  const box = `${Math.max(-180, p.longitude - 0.04)},${Math.max(-85, p.latitude - 0.04)},${Math.min(180, p.longitude + 0.04)},${Math.min(85, p.latitude + 0.04)}`;
  const uri = `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${p.latitude},${p.longitude}`;
  return <View style={{ height: 360, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.accentSoft }}>
    <WebView key={`${p.id}-${retry}`} source={{ uri }} style={{ flex: 1 }} nestedScrollEnabled startInLoadingState renderLoading={() => <ActivityIndicator color={colors.primary} style={{ position: 'absolute', inset: 0 }} />} onLoadStart={() => setError(false)} onError={() => setError(true)} onHttpError={() => setError(true)} originWhitelist={['https://*']} onShouldStartLoadWithRequest={request => { if (request.url.startsWith('https://www.openstreetmap.org/')) return true; if (request.url.startsWith('https://')) Linking.openURL(request.url).catch(() => setError(true)); return false; }} />
    {error ? <View style={{ position: 'absolute', inset: 0, backgroundColor: colors.accentSoft, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 16 }}><Text style={{ color: colors.text }}>Map could not load. Check your connection.</Text><Pressable onPress={() => { setError(false); setRetry(v => v + 1); }}><Text style={{ color: colors.primary, fontWeight: '800' }}>Retry map</Text></Pressable></View> : null}
  </View>;
}
