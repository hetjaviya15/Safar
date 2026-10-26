import type { Destination } from '@/types/models';
import { travelPhotos } from '@/constants/travel-photos';

const endpoint = process.env.EXPO_PUBLIC_GEOCODING_URL ?? 'https://nominatim.openstreetmap.org';
let nextSearchTime = 0;
const searchCache = new Map<string, Destination[]>();

export const featuredDestinations: Destination[] = [
  { placeId: 'featured-kyoto', name: 'Kyoto', displayName: 'Kyoto, Japan', country: 'Japan', category: 'Culture', latitude: 35.0116, longitude: 135.7681, imageUrl: travelPhotos.find(p => p.id === "kyoto")!.url },
  { placeId: 'featured-bali', name: 'Bali', displayName: 'Bali, Indonesia', country: 'Indonesia', category: 'Beach', latitude: -8.3405, longitude: 115.092, imageUrl: travelPhotos.find(p => p.id === "bali")!.url },
  { placeId: 'featured-zermatt', name: 'Zermatt', displayName: 'Zermatt, Switzerland', country: 'Switzerland', category: 'Mountains', latitude: 46.0207, longitude: 7.7491, imageUrl: travelPhotos.find(p => p.id === "zermatt")!.url },
  { placeId: 'featured-jaipur', name: 'Jaipur', displayName: 'Jaipur, Rajasthan, India', country: 'India', category: 'Cities', latitude: 26.9124, longitude: 75.7873, imageUrl: travelPhotos.find(p => p.id === "jaipur")!.url },
  { placeId: 'featured-cape-town', name: 'Cape Town', displayName: 'Cape Town, South Africa', country: 'South Africa', category: 'Nature', latitude: -33.9249, longitude: 18.4241, imageUrl: travelPhotos.find(p => p.id === "cape-town")!.url },
  { placeId: 'featured-paris', name: 'Paris', displayName: 'Paris, France', country: 'France', category: 'Food', latitude: 48.8566, longitude: 2.3522, imageUrl: travelPhotos.find(p => p.id === "paris")!.url },
  { placeId: 'featured-tokyo', name: 'Tokyo', displayName: 'Tokyo, Japan', country: 'Japan', category: 'Cities', latitude: 35.6762, longitude: 139.6503 },
  { placeId: 'featured-manali', name: 'Manali', displayName: 'Manali, Himachal Pradesh, India', country: 'India', category: 'Mountains', latitude: 32.2396, longitude: 77.1887, imageUrl: travelPhotos.find(p => p.id === "manali")!.url },
  { placeId: 'featured-goa', name: 'Goa', displayName: 'Goa, India', country: 'India', category: 'Beach', latitude: 15.2993, longitude: 74.1240 },
  { placeId: 'featured-singapore', name: 'Singapore', displayName: 'Singapore', country: 'Singapore', category: 'Cities', latitude: 1.3521, longitude: 103.8198 },
  { placeId: 'featured-rome', name: 'Rome', displayName: 'Rome, Italy', country: 'Italy', category: 'Culture', latitude: 41.9028, longitude: 12.4964 },
  { placeId: 'featured-phuket', name: 'Phuket', displayName: 'Phuket, Thailand', country: 'Thailand', category: 'Beach', latitude: 7.8804, longitude: 98.3923 },
  { placeId: 'featured-cusco', name: 'Cusco', displayName: 'Cusco, Peru', country: 'Peru', category: 'Adventure', latitude: -13.5319, longitude: -71.9675 },
  { placeId: 'featured-marrakesh', name: 'Marrakesh', displayName: 'Marrakesh, Morocco', country: 'Morocco', category: 'Culture', latitude: 31.6295, longitude: -7.9811 },
];

type NominatimResult = { place_id: number; display_name: string; lat: string; lon: string; name?: string; type?: string; address?: { country?: string; state?: string; city?: string; town?: string; village?: string } };

export async function searchDestinations(query: string, signal?: AbortSignal, near?: { latitude: number; longitude: number }): Promise<Destination[]> {
  const value = query.trim(); if (value.length < 2) return [];
  const cacheKey = `${value.toLocaleLowerCase()}:${near?.latitude ?? ''}:${near?.longitude ?? ''}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;
  const bounds = near ? `&bounded=1&viewbox=${near.longitude - 0.45},${near.latitude + 0.45},${near.longitude + 0.45},${near.latitude - 0.45}` : '';
  const delay = Math.max(0, nextSearchTime - Date.now()); nextSearchTime = Date.now() + delay + 1100;
  if (delay) await new Promise(resolve => setTimeout(resolve, delay));
  if (signal?.aborted) throw new Error('Search cancelled');
  const url = `${endpoint.replace(/\/$/, '')}/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(value)}${bounds}`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json', 'Accept-Language': 'en', 'User-Agent': 'SafarTravelPlanner/1.0' } });
  if (!response.ok) throw new Error(response.status === 429 ? 'Place search is busy. Enter the destination manually or try again shortly.' : 'Destination search is unavailable. You can still enter a custom location.');
  const rows = await response.json() as NominatimResult[];
  const destinations = rows.map(row => ({ placeId: `osm-${row.place_id}`, name: row.name || row.address?.city || row.address?.town || row.address?.village || row.display_name.split(',')[0], displayName: row.display_name, country: row.address?.country, region: row.address?.state, latitude: Number(row.lat), longitude: Number(row.lon), category: row.type }));
  searchCache.set(cacheKey, destinations);
  return destinations;
}

export function customDestination(value: string): Destination { return { placeId: `custom-${Date.now()}`, name: value.trim().split(',')[0], displayName: value.trim() }; }
