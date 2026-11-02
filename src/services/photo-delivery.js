import { invokeBackend } from './backend-request';
export { commonsPhotoUrls } from '../../supabase/functions/_shared/photo-url';
const cache = new Map();
const pending = new Map();
let running = 0;
const waiting = [];
export async function loadPhotoFallback(url) {
  const cached = cache.get(url);
  if (cached) return cached;
  const existing = pending.get(url);
  if (existing) return existing;
  const request = (async () => {
    if (running >= 2) await new Promise(resolve => waiting.push(resolve));else running++;
    try {
      const result = await invokeBackend('safar-destinations', {
        action: 'photo',
        url
      });
      if (!/^data:image\/(jpeg|png|webp|gif);base64,/.test(result.dataUri) || result.dataUri.length > 2_700_000) throw new Error('Photo could not load.');
      if (cache.size >= 8) cache.delete(cache.keys().next().value);
      cache.set(url, result.dataUri);
      return result.dataUri;
    } finally {
      const next = waiting.shift();
      if (next) next();else running--;
    }
  })().finally(() => pending.delete(url));
  pending.set(url, request);
  return request;
}