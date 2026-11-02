import { View } from 'react-native';
import { colors } from '@/constants/theme';
export function TravelMap({
  points,
  selected
}) {
  const p = points.find(point => point.id === selected) ?? points[0];
  if (!p) return null;
  const box = `${p.longitude - 0.04},${p.latitude - 0.04},${p.longitude + 0.04},${p.latitude + 0.04}`;
  return <View style={{
    height: 410,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted
  }}><iframe title={`Map of ${p.name}`} style={{
      border: 0,
      width: '100%',
      height: '100%'
    }} src={`https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${p.latitude},${p.longitude}`} /></View>;
}