import { commonsPhotoUrls } from './photo-url.ts';
import { SafeError } from './http.ts';

const MAX_BYTES = 2_000_000;
/** Authenticated, rate-limited fallback when a device cannot reach Wikimedia directly. */
export async function deliverPhoto(value: unknown, signal?: AbortSignal): Promise<{ dataUri: string }> {
  const urls = commonsPhotoUrls(value);
  if (!urls.length) throw new SafeError('Choose a supported Wikimedia photograph.');
  for (const url of urls) {
    const response = await fetch(url, { signal, redirect: 'error', headers: { Accept: 'image/jpeg,image/png,image/webp,image/gif', 'User-Agent': 'SafarTravel/1.0 (licensed destination photographs)' } }).catch(() => null);
    if (!response) { if (signal?.aborted) throw new SafeError('Photo request timed out. Please retry.', 504); continue; }
    const type = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || !type || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) { await response.body?.cancel(); continue; }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body?.cancel(); throw new SafeError('This photograph is too large to load.', 413); }
    const reader = response.body?.getReader();
    if (!reader) continue;
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read(); if (done) break;
        size += chunk.length;
        if (size > MAX_BYTES) { await reader.cancel(); throw new SafeError('This photograph is too large to load.', 413); }
        chunks.push(chunk);
      }
    } finally { reader.releaseLock(); }
    if (!size) continue;
    // Small slices avoid exceeding the JS argument/stack limit for large files.
    let binary = '';
    for (const chunk of chunks) for (let i = 0; i < chunk.length; i += 8192) binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
    return { dataUri: `data:${type};base64,${btoa(binary)}` };
  }
  throw new SafeError('The photo provider is temporarily unavailable. Please retry.', 502);
}
