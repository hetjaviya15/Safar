import type { Destination } from './geo.ts';
type Feature = { geometry?: { coordinates?: number[] }; properties?: Record<string, string | number | number[]> };
export function parsePhotonResults(features: Feature[]): Destination[] {
  const seen = new Set<string>();
  return features.flatMap(f => {
    const p = f.properties ?? {}; const [lon, lat] = f.geometry?.coordinates ?? [];
    if (!p.name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return [];
    const extent = Array.isArray(p.extent) && p.extent.length === 4 && p.extent.every(Number.isFinite) ? p.extent : undefined;
    const bounds: [number, number, number, number] | undefined = extent ? [extent[0], extent[3], extent[2], extent[1]] : undefined;
    const name = String(p.name); const parts = [...new Set([name, p.city, p.state, p.country].filter(Boolean).map(String))];
    const key = `${name}:${lat.toFixed(3)}:${lon.toFixed(3)}`; if (seen.has(key)) return []; seen.add(key);
    return [{ placeId: `photon-${p.osm_type}-${p.osm_id}`, name, displayName: parts.join(', '), country: p.country ? String(p.country) : undefined, region: p.state ? String(p.state) : undefined, latitude: lat, longitude: lon, bounds, category: p.osm_value ? String(p.osm_value).replaceAll('_', ' ') : undefined }];
  });
}
