import { authorizedBackend, reserve, finishUsage } from '../_shared/backend.ts';
import { cors, json, readBody, SafeError, readTextLimited } from '../_shared/http.ts';
import { validDestination } from '../_shared/geo.ts';
import { loadDestinationInfo } from '../_shared/destination-provider.ts';
import { parsePhotonResults } from '../_shared/photon.ts';
import { deliverPhoto } from '../_shared/photo-delivery.ts';
import { commonsPhotoUrls } from '../_shared/photo-url.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let backend: Awaited<ReturnType<typeof authorizedBackend>> | undefined;
  let usageId: string | undefined; let outcome = 'internal_error'; const started = Date.now();
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 24000);
  try {
    backend = await authorizedBackend(request);
    const body = await readBody(request);
    if (body.action === 'photo') {
      if (!commonsPhotoUrls(body.url).length) throw new SafeError('Choose a supported Wikimedia photograph.');
      const photoDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ version: 1, action: 'photo', url: body.url })));
      const photoKey = Array.from(new Uint8Array(photoDigest), v => v.toString(16).padStart(2, '0')).join('');
      const { data: cachedPhoto } = await backend.admin.from('destination_cache').select('payload,expires_at').eq('cache_key', photoKey).maybeSingle();
      if (cachedPhoto && Date.parse(cachedPhoto.expires_at) > Date.now()) { outcome = 'cache_hit'; return json(cachedPhoto.payload); }
      const reservation = await reserve(backend.admin, backend.user.id, 'destination');
      usageId = reservation.id;
      const photo = await deliverPhoto(body.url, controller.signal);
      await backend.admin.from('destination_cache').upsert({ cache_key: photoKey, payload: photo, expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), updated_at: new Date().toISOString() });
      outcome = 'success'; return json(photo);
    }
    const details = body.action === 'details';
    if (!details && body.action !== 'suggest') throw new SafeError('Choose a supported search action.');
    if (details ? !validDestination(body.destination) : typeof body.query !== 'string' || body.query.trim().length < 3 || body.query.length > 150) throw new SafeError('Enter a valid destination.');
    const input = details ? body.destination : String(body.query).trim().toLocaleLowerCase();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ version: details ? 3 : 1, action: body.action, input })));
    const key = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('');
    // A fresh cache hit does not call an external provider. Read it before
    // reserving provider quota so repeat views do not consume the user's limit.
    const { data: cached } = await backend.admin.from('destination_cache').select('payload,expires_at').eq('cache_key', key).maybeSingle();
    if (cached && Date.parse(cached.expires_at) > Date.now()) { outcome = 'cache_hit'; return json(cached.payload); }
    const reservation = await reserve(backend.admin, backend.user.id, details ? 'destination' : 'autocomplete');
    usageId = reservation.id;
    let payload: unknown; let complete = true;
    if (details && validDestination(body.destination)) {
      const info = await loadDestinationInfo(body.destination, controller.signal);
      // A provider outage must not erase useful, previously verified information.
      if (!info.overview && !info.photo && !info.nearby.length && cached) {
        outcome = 'cache_hit'; return json({ ...cached.payload, warning: 'Showing saved travel information. Some details may have changed.' });
      }
      complete = !!info.photo || (!info.warning && !!info.overview);
      payload = info;
    } else {
      const endpoint = Deno.env.get('PHOTON_BASE_URL') || 'https://photon.komoot.io';
      if (!endpoint.startsWith('https://')) throw new SafeError('Search is temporarily unavailable.', 503);
      const response = await fetch(endpoint.replace(/\/$/, '') + '/api/?q=' + encodeURIComponent(String(input)) + '&limit=6&lang=en', { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) { outcome = 'provider_error'; throw new SafeError('Suggestions are busy. Try again shortly or use a custom destination.', 502); }
      const data = JSON.parse(await readTextLimited(response, 100000));
      if (!Array.isArray(data.features)) throw new SafeError('Suggestions are temporarily unavailable.', 502);
      payload = { destinations: parsePhotonResults(data.features) };
    }
    const { error } = await backend.admin.from('destination_cache').upsert({ cache_key: key, payload, expires_at: new Date(Date.now() + (complete ? 86400000 : 300000)).toISOString(), updated_at: new Date().toISOString() });
    if (error) console.warn(JSON.stringify({ event: 'destination_cache_failed', requestId: usageId }));
    outcome = 'success'; return json(payload);
  } catch (error) {
    if (error instanceof SafeError) return json({ error: error.message }, error.status);
    outcome = controller.signal.aborted ? 'timeout' : 'provider_error';
    console.warn(JSON.stringify({ event: 'destination_request_failed', requestId: usageId, outcome }));
    return json({ error: 'Travel information is taking longer than usual. You can still plan this trip or try again shortly.' }, 502);
  } finally {
    clearTimeout(timer);
    if (backend && usageId) await finishUsage(backend.admin, usageId, outcome, started);
  }
});
