import { invokeBackend } from './backend-request';
import { loadDestinationInfo as loadDirectInfo } from '../../supabase/functions/_shared/destination-provider';
const cache = new Map();
const pending = new Map();
let running = 0;
const waiting = [];
async function queuedDetails(destination) {
  if (running >= 2) await new Promise(resolve => waiting.push(resolve));else running++;
  try {
    try {
      return await invokeBackend('safar-destinations', {
        action: 'details',
        destination
      });
    } catch (backendError) {
      if (typeof loadDirectInfo === 'function') {
        try {
          const direct = await loadDirectInfo(destination);
          if (direct && (direct.overview || direct.photo || direct.nearby && direct.nearby.length > 0)) {
            return direct;
          }
        } catch {
          // If direct provider also fails, throw the original backend error
        }
      }
      throw backendError;
    }
  } finally {
    const next = waiting.shift();
    if (next) next();else running--;
  }
}
export async function loadDestinationInfo(destination, signal) {
  if (signal?.aborted) throw new Error('Request cancelled');
  const key = JSON.stringify([destination.placeId, destination.name, destination.country, destination.latitude, destination.longitude, destination.bounds]);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.info;
  let request = pending.get(key);
  if (!request) {
    request = queuedDetails(destination).then(info => {
      if (!Array.isArray(info.nearby)) throw new Error('Travel information could not load. Please try again.');
      if (cache.size > 40) cache.delete(cache.keys().next().value);
      cache.set(key, {
        info,
        expires: Date.now() + (info.warning ? 30000 : 3600000)
      });
      return info;
    }).finally(() => pending.delete(key));
    pending.set(key, request);
  }

  // Each consumer may cancel without cancelling another card's shared request.
  const info = await request;
  if (signal?.aborted) throw new Error('Request cancelled');
  return info;
}