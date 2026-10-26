import type { Destination } from '@/types/models';
import { invokeBackend } from './backend-request';
import { parsePhotonResults } from '../../supabase/functions/_shared/photon';

const cache = new Map<string, Destination[]>();

async function fallbackSuggest(q: string, signal?: AbortSignal): Promise<Destination[]> {
  const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Suggestions unavailable. Use a custom destination or try again.');
  const data = await response.json();
  if (!Array.isArray(data.features)) throw new Error('Suggestions unavailable. Use a custom destination or try again.');
  return parsePhotonResults(data.features);
}

export async function suggestDestinations(query: string, signal?: AbortSignal): Promise<Destination[]> {
  const q = query.trim(); if (q.length < 3) return [];
  const key = q.toLocaleLowerCase(); if (cache.has(key)) return cache.get(key)!;
  try {
    const data = await invokeBackend<{ destinations: Destination[] }>('safar-destinations', { action: 'suggest', query: q }, signal);
    if (!Array.isArray(data.destinations)) throw new Error('Suggestions unavailable.');
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, data.destinations); return data.destinations;
  } catch (err) {
    if (signal?.aborted) throw err;
    try {
      const fallback = await fallbackSuggest(q, signal);
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, fallback);
      return fallback;
    } catch {
      throw err instanceof Error ? err : new Error('Suggestions unavailable. Use a custom destination or try again.');
    }
  }
}

