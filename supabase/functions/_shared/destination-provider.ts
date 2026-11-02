import { hasCoordinates, withinBounds, type Destination } from './geo.ts';

export type PlacePhoto = { url: string; credit: string; sourceUrl: string; license: string; provider?: 'Wikimedia Commons' | 'Unsplash'; creditUrl?: string };
export type NearbyPlace = { id: string; name: string; detail: string; latitude: number; longitude: number; sourceUrl: string; photo?: PlacePhoto };
export type DestinationInfo = { overview?: string; sourceUrl?: string; photo?: PlacePhoto; nearby: NearbyPlace[]; bestTime?: string; seasonSource?: string; warning?: string };
type WikiPage = { pageid: number; title: string; missing?: boolean; extract?: string; fullurl?: string; pageprops?: { disambiguation?: string }; coordinates?: { lat: number; lon: number }[]; thumbnail?: { source: string }; pageimage?: string; imageinfo?: { descriptionurl?: string; url?: string; thumburl?: string; width?: number; height?: number; mime?: string; extmetadata?: Record<string, { value: string }> }[]; globalusage?: { wiki: string; title: string; url: string }[] };
const cache = new Map<string, DestinationInfo>();
const wiki = 'https://en.wikipedia.org/w/api.php';
const voyage = 'https://en.wikivoyage.org/w/api.php';

export function plainText(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
export function distanceKm(lat: number, lon: number, otherLat: number, otherLon: number) {
  const rad = Math.PI / 180; const a = Math.sin((otherLat - lat) * rad / 2) ** 2 + Math.cos(lat * rad) * Math.cos(otherLat * rad) * Math.sin((otherLon - lon) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
async function request(endpoint: string, params: Record<string, string>, signal?: AbortSignal) {
  const controller = new AbortController(); const abort = () => controller.abort();
  signal?.addEventListener('abort', abort); if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 10000);
  try {
    const response = await fetch(endpoint + '?' + new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params }), { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'SafarTravel/1.0 (https://safarapp.com; destination discovery; Wikimedia attribution in app)' } });
    if (!response.ok) throw new Error('Destination information is temporarily unavailable.');
    const result = await response.json(); if (result.error) throw new Error('Local travel information is temporarily unavailable.');
    return result;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
function matchesPlace(page: WikiPage, d: Destination) {
  if (page.missing || page.pageprops?.disambiguation !== undefined) return false;
  const point = page.coordinates?.[0];
  const pageTitle = page.title.toLocaleLowerCase();
  const destName = d.name.toLocaleLowerCase();
  const named = pageTitle === destName || pageTitle.startsWith(destName + ',') || pageTitle.startsWith(destName + ' (');
  if (!hasCoordinates(d)) return named;
  if (point) {
    const dist = distanceKm(d.latitude, d.longitude, point.lat, point.lon);
    if (dist < 60 && named) return true;
    if (d.bounds && withinBounds(point.lat, point.lon, d.bounds) && named) return true;
    return dist < 35;
  }
  return named;
}
async function photoCredits(pages: WikiPage[], signal?: AbortSignal) {
  const names = [...new Set(pages.filter(p => p.thumbnail && p.pageimage && !/\.svg$/i.test(p.pageimage)).map(p => 'File:' + p.pageimage))];
  if (!names.length) return new Map<string, PlacePhoto>();
  const data = await request('https://commons.wikimedia.org/w/api.php', { action: 'query', titles: names.join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata' }, signal).catch(() => null);
  const map = new Map<string, PlacePhoto>();
  if (!data?.query?.pages) return map;
  for (const page of (data.query.pages ?? []) as WikiPage[]) {
    const info = page.imageinfo?.[0]; const meta = info?.extmetadata;
    const original = pages.find(p => ('File:' + p.pageimage).replaceAll('_', ' ').toLowerCase() === page.title.replaceAll('_', ' ').toLowerCase());
    if (!original?.thumbnail || !info?.descriptionurl) continue;
    const credit = plainText(meta?.Artist?.value ?? meta?.Credit?.value ?? meta?.Author?.value ?? 'Wikimedia Commons contributor').slice(0, 180);
    const license = plainText(meta?.LicenseShortName?.value ?? meta?.License?.value ?? meta?.UsageTerms?.value ?? 'CC BY-SA');
    map.set(original.pageimage!, { url: original.thumbnail.source, credit, sourceUrl: info.descriptionurl, license, provider: 'Wikimedia Commons' });
  }
  return map;
}
/**
 * If the destination article has no usable lead image, use nearby geotagged
 * Commons photos. Geosearch keeps the result tied to this place; global usage
 * count is a useful signal for choosing a representative, widely reused photo.
 */
async function popularNearbyPhoto(destination: Destination, signal?: AbortSignal): Promise<PlacePhoto | undefined> {
  if (!hasCoordinates(destination)) return undefined;
  const data = await request('https://commons.wikimedia.org/w/api.php', {
    action: 'query', generator: 'geosearch', ggscoord: `${destination.latitude}|${destination.longitude}`,
    ggsradius: '10000', ggslimit: '50', ggsnamespace: '6', prop: 'coordinates|imageinfo|globalusage',
    iiprop: 'url|extmetadata', iiurlwidth: '1280', gulimit: '10', guprop: 'url',
  }, signal).catch(() => null);
  if (!data?.query?.pages) return undefined;
  const pages = (data.query.pages ?? []) as WikiPage[];
  const candidates = pages.flatMap(page => {
    const info = page.imageinfo?.[0]; const meta = info?.extmetadata;
    if (!info?.thumburl || !info.descriptionurl || /\.svg$/i.test(page.title) || !info.mime?.startsWith('image/')) return [];
    const point = page.coordinates?.[0];
    const dist = point ? distanceKm(destination.latitude, destination.longitude, point.lat, point.lon) : Infinity;
    if (dist > 35) return [];
    const credit = plainText(meta?.Artist?.value ?? meta?.Credit?.value ?? meta?.Author?.value ?? 'Wikimedia Commons contributor').slice(0, 180);
    const license = plainText(meta?.LicenseShortName?.value ?? meta?.License?.value ?? meta?.UsageTerms?.value ?? 'CC BY-SA');
    return [{ info, credit, license, popularity: page.globalusage?.length ?? 0, dist }];
  });
  candidates.sort((a, b) => b.popularity - a.popularity || a.dist - b.dist);
  const selected = candidates[0];
  if (!selected) return undefined;
  return {
    url: selected.info.thumburl!,
    sourceUrl: selected.info.descriptionurl!,
    credit: selected.credit,
    license: selected.license,
    provider: 'Wikimedia Commons',
  };
}

/** Keyword search on Commons if article image and nearby geosearch are absent. */
async function searchCommonsPhoto(destination: Destination, signal?: AbortSignal): Promise<PlacePhoto | undefined> {
  const query = `${destination.name} ${destination.country ?? ''}`.trim();
  const data = await request('https://commons.wikimedia.org/w/api.php', {
    action: 'query', generator: 'search', gsrsearch: query,
    gsrlimit: '15', gsrnamespace: '6', prop: 'coordinates|imageinfo|globalusage',
    iiprop: 'url|extmetadata|mime', iiurlwidth: '1280', gulimit: '10', guprop: 'url',
  }, signal).catch(() => null);
  if (!data?.query?.pages) return undefined;
  const pages = (data.query.pages ?? []) as WikiPage[];
  const candidates = pages.flatMap(page => {
    const info = page.imageinfo?.[0]; const meta = info?.extmetadata;
    if (!info?.thumburl || !info.descriptionurl || /\.svg$/i.test(page.title) || (info.mime && !info.mime.startsWith('image/'))) return [];
    const credit = plainText(meta?.Artist?.value ?? meta?.Credit?.value ?? meta?.Author?.value ?? 'Wikimedia Commons contributor').slice(0, 180);
    const license = plainText(meta?.LicenseShortName?.value ?? meta?.License?.value ?? meta?.UsageTerms?.value ?? 'CC BY-SA');
    const point = page.coordinates?.[0];
    const dist = (hasCoordinates(destination) && point) ? distanceKm(destination.latitude, destination.longitude, point.lat, point.lon) : 0;
    return [{ url: info.thumburl, sourceUrl: info.descriptionurl, credit, license, provider: 'Wikimedia Commons' as const, popularity: page.globalusage?.length ?? 0, dist }];
  });
  if (!candidates.length) return undefined;
  candidates.sort((a, b) => b.popularity - a.popularity || a.dist - b.dist);
  const best = candidates[0];
  return { url: best.url, sourceUrl: best.sourceUrl, credit: best.credit, license: best.license, provider: 'Wikimedia Commons' };
}

type UnsplashPhoto = { urls?: { regular?: string }; links?: { html?: string }; user?: { name?: string; links?: { html?: string } } };
/** Use Unsplash only after the destination article and nearby Commons search fail. */
async function unsplashPhoto(destination: Destination, signal?: AbortSignal): Promise<PlacePhoto | undefined> {
  const denoRuntime = (globalThis as typeof globalThis & { Deno?: { env: { get(name: string): string | undefined } } }).Deno;
  const accessKey = denoRuntime?.env.get('UNSPLASH_ACCESS_KEY')?.trim() || (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY : undefined);
  if (!accessKey) return undefined;
  const controller = new AbortController(); const abort = () => controller.abort();
  signal?.addEventListener('abort', abort); if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 7000);
  try {
    const params = new URLSearchParams({ query: `${destination.name} ${destination.country ?? ''} travel landmark`.trim(), per_page: '1', orientation: 'landscape', content_filter: 'high' });
    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, { signal: controller.signal, headers: { Accept: 'application/json', Authorization: `Client-ID ${accessKey}` } });
    if (!response.ok) return undefined;
    const data = await response.json() as { results?: UnsplashPhoto[] };
    const photo = data.results?.find(item => item.urls?.regular && item.links?.html && item.user?.name && item.user.links?.html);
    if (!photo?.urls?.regular || !photo.links?.html || !photo.user?.name || !photo.user.links?.html) return undefined;
    const tracking = 'utm_source=safar&utm_medium=referral';
    const withTracking = (url: string) => `${url}${url.includes('?') ? '&' : '?'}${tracking}`;
    return {
      url: photo.urls.regular,
      credit: photo.user.name,
      sourceUrl: withTracking(photo.links.html),
      creditUrl: withTracking(photo.user.links.html),
      license: 'Unsplash License',
      provider: 'Unsplash',
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort);
  }
}
function getSeasonalGuidance(destination: Destination, sourceUrl?: string) {
  const lat = destination.latitude;
  let bestTime = '';
  if (destination.country?.toLowerCase() === 'india' || (typeof lat === 'number' && lat >= 8 && lat <= 35 && (destination.longitude ?? 0) >= 68 && (destination.longitude ?? 0) <= 97)) {
    bestTime = 'The ideal time to visit is during the cooler, drier months from October to March, when daytime temperatures are pleasant and comfortable for sightseeing. Summers (April to June) are typically very hot, while the southwest monsoon brings rainfall from July through September.';
  } else if (typeof lat === 'number' && Math.abs(lat) <= 15) {
    bestTime = 'A warm tropical climate persists year-round. The dry season is typically the most comfortable period for exploring outdoors and visiting attractions, while the greener wet season features refreshing periodic showers.';
  } else if (typeof lat === 'number' && lat >= 0 && lat <= 40) {
    bestTime = 'Spring (March to May) and autumn (September to November) offer the most pleasant weather for travel, with mild temperatures and clear skies. Summer can be warm and sunny, while winters are generally mild.';
  } else if (typeof lat === 'number' && lat > 40) {
    bestTime = 'The warmer months from May through September are ideal for sightseeing, outdoor excursions, and long daylight hours. Spring brings pleasant blooms, while winter offers cold, atmospheric seasonal travel.';
  } else {
    bestTime = 'The Southern Hemisphere summer and shoulder seasons (November to April) offer the warmest conditions and longer daylight hours for travel and outdoor exploration.';
  }
  return {
    bestTime,
    seasonSource: sourceUrl ?? 'https://en.wikivoyage.org/wiki/' + encodeURIComponent(destination.displayName ?? destination.name)
  };
}

async function seasonNotes(title: string, destination: Destination, signal?: AbortSignal) {
  try {
    const check = await request(voyage, { action: 'query', titles: title, redirects: '1', prop: 'coordinates' }, signal);
    const page = (check.query?.pages ?? [])[0] as WikiPage | undefined;
    const coordinate = page?.coordinates?.[0];
    if (page && !page.missing && (!coordinate || !hasCoordinates(destination) || distanceKm(destination.latitude, destination.longitude, coordinate.lat, coordinate.lon) <= 60)) {
      const sections = await request(voyage, { action: 'parse', page: page.title, prop: 'tocdata' }, signal);
      const section = (sections.parse?.tocdata?.sections ?? []).find((s: { line?: string }) => /^(climate|when to go|when to visit|best time to visit|weather)$/i.test(plainText(s.line ?? '')));
      if (section) {
        const data = await request(voyage, { action: 'parse', page: page.title, section: String(section.index), prop: 'text' }, signal);
        const html = typeof data.parse?.text === 'string' ? data.parse.text : data.parse?.text?.['*'] ?? '';
        const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m => plainText(m[1])).filter(p => p.length > 40);
        if (paragraphs.length) {
          return {
            bestTime: paragraphs.join(' ').slice(0, 1200),
            seasonSource: 'https://en.wikivoyage.org/wiki/' + encodeURIComponent(page.title.replaceAll(' ', '_')) + '#Climate'
          };
        }
      }
      const guideUrl = 'https://en.wikivoyage.org/wiki/' + encodeURIComponent(page.title.replaceAll(' ', '_'));
      return getSeasonalGuidance(destination, guideUrl);
    }
  } catch {
    // Fall back to geographic climate guidance
  }
  return getSeasonalGuidance(destination);
}

export async function loadDestinationInfo(d: Destination, signal?: AbortSignal): Promise<DestinationInfo> {
  const key = `photo-v4:${d.placeId}:${d.latitude}:${d.longitude}`; if (cache.has(key)) return cache.get(key)!;
  const params = { action: 'query', prop: 'coordinates|pageimages|extracts|info|pageprops', piprop: 'thumbnail|name', pithumbsize: '1000', pilicense: 'free', exintro: '1', explaintext: '1', exsentences: '4', inprop: 'url' };
  let article: WikiPage | undefined; let nearbyPages: WikiPage[] = [];
  const searchTitles = [d.name, d.region ? `${d.name}, ${d.region}` : '', d.country ? `${d.name}, ${d.country}` : ''].filter(Boolean).join('|');
  const [direct, around] = await Promise.allSettled([
    request(wiki, { ...params, titles: searchTitles, redirects: '1' }, signal),
    hasCoordinates(d) ? request(wiki, { ...params, generator: 'geosearch', ggscoord: `${d.latitude}|${d.longitude}`, ggsradius: '10000', ggslimit: '25', exlimit: 'max' }, signal) : Promise.resolve(null),
  ]);
  if (direct.status === 'fulfilled') {
    const pages = (direct.value.query?.pages as WikiPage[] | undefined) ?? [];
    article = pages.find(p => matchesPlace(p, d));
  }
  if (around.status === 'fulfilled') nearbyPages = (around.value?.query?.pages ?? []) as WikiPage[];
  if (!article && hasCoordinates(d)) {
    const found = await request(wiki, { ...params, generator: 'search', gsrsearch: `${d.name} ${d.region ?? ''} ${d.country ?? ''}`.trim(), gsrlimit: '5' }, signal).catch(() => null);
    article = (found?.query?.pages as WikiPage[] | undefined)?.filter(p => matchesPlace(p, d)).sort((a, b) => (a.title.toLowerCase().startsWith(d.name.toLowerCase()) ? -1 : 1) - (b.title.toLowerCase().startsWith(d.name.toLowerCase()) ? -1 : 1))[0];
  }
  const candidates = nearbyPages.filter(p => {
    if (p.pageid === article?.pageid || !p.coordinates?.[0] || !p.thumbnail || p.pageprops?.disambiguation !== undefined) return false;
    const dist = hasCoordinates(d) ? distanceKm(d.latitude, d.longitude, p.coordinates[0].lat, p.coordinates[0].lon) : 0;
    return dist <= 25;
  });
  const attraction = /museum|palace|fort\b|temple|mosque|cathedral|church|park\b|garden|lake\b|monument|market|gallery|beach|castle|tower|bridge|square|zoo\b|caves|sanctuary|ruins|dam\b|bazaar|hill|falls/i;
  candidates.sort((a, b) => Number(attraction.test(b.title + (b.extract ?? ''))) - Number(attraction.test(a.title + (a.extract ?? ''))));
  const places = candidates.slice(0, 6);
  const [photos, seasons] = await Promise.allSettled([photoCredits([...(article ? [article] : []), ...places], signal), seasonNotes(article?.title ?? d.name, d, signal)]);
  const credits = photos.status === 'fulfilled' ? photos.value : new Map<string, PlacePhoto>();
  const articlePhoto = article?.pageimage ? credits.get(article.pageimage) : undefined;
  const commonsPhoto = articlePhoto ?? await popularNearbyPhoto(d, signal).catch(() => undefined) ?? await searchCommonsPhoto(d, signal).catch(() => undefined);
  const photo = commonsPhoto ?? await unsplashPhoto(d, signal);
  const result: DestinationInfo = {
    overview: article?.extract?.slice(0, 800) || `${d.displayName} is located in ${[d.region, d.country].filter(Boolean).join(', ')}. Explore the map and discover nearby places to plan your journey.`,
    sourceUrl: article?.fullurl,
    photo,
    nearby: places.map(p => ({
      id: 'wiki-' + p.pageid,
      name: p.title,
      detail: p.extract?.slice(0, 220) ?? 'Discover this nearby place.',
      latitude: p.coordinates![0].lat,
      longitude: p.coordinates![0].lon,
      sourceUrl: p.fullurl ?? 'https://en.wikipedia.org/?curid=' + p.pageid,
      photo: credits.get(p.pageimage ?? '')
    })),
    ...(seasons.status === 'fulfilled' ? seasons.value : getSeasonalGuidance(d)),
    warning: direct.status === 'rejected' && around.status === 'rejected' ? 'Live travel information could not load. Check your connection and try again.' : undefined,
  };
  if (signal?.aborted) throw new Error('Request cancelled');
  if (!result.warning || result.photo) { if (cache.size >= 40) cache.delete(cache.keys().next().value!); cache.set(key, result); }
  return result;
}
