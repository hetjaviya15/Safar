export type Destination = { placeId: string; name: string; displayName: string; country?: string; region?: string; latitude?: number; longitude?: number; category?: string; imageUrl?: string; bounds?: [number, number, number, number] };
export function hasCoordinates(d: { latitude?: number; longitude?: number }): d is { latitude: number; longitude: number } {
  return typeof d.latitude === 'number' && typeof d.longitude === 'number' && Number.isFinite(d.latitude) && Number.isFinite(d.longitude) && Math.abs(d.latitude) <= 90 && Math.abs(d.longitude) <= 180;
}
/** west,south,east,north; supports bounding boxes crossing the antimeridian. */
export function withinBounds(lat: number, lon: number, [west, south, east, north]: number[]) {
  return lat >= south && lat <= north && (west <= east ? lon >= west && lon <= east : lon >= west || lon <= east);
}
export function validDestination(v: unknown): v is Destination {
  if (!v || typeof v !== 'object') return false;
  const d = v as Destination;
  if (![d.placeId, d.name, d.displayName].every(s => typeof s === 'string' && s.trim().length > 0 && s.length <= 300)) return false;
  if ([d.country, d.region, d.category].some(s => s !== undefined && (typeof s !== 'string' || s.length > 120))) return false;
  if ((d.latitude !== undefined || d.longitude !== undefined) && !hasCoordinates(d)) return false;
  return d.bounds === undefined || (Array.isArray(d.bounds) && d.bounds.length === 4 && d.bounds.every(Number.isFinite) && Math.abs(d.bounds[0]) <= 180 && Math.abs(d.bounds[2]) <= 180 && Math.abs(d.bounds[1]) <= 90 && Math.abs(d.bounds[3]) <= 90 && d.bounds[1] <= d.bounds[3]);
}
