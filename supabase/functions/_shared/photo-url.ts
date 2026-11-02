/** Only public Commons raster files, never arbitrary URLs, credentials or query strings. */
export function commonsPhotoUrls(value: unknown): string[] {
  if (typeof value !== 'string' || value.length > 2000) return [];
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname)) return [];
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes('..') || !/^\/wikipedia\/commons\/(?:thumb\/)?[a-f0-9]\/[a-f0-9]{2}\/.+\.(?:jpe?g|png|webp|gif)$/i.test(decoded)) return [];
    url.search = ''; url.hash = ''; url.hostname = 'upload.wikimedia.org';
    const primary = url.toString();
    if (!url.pathname.startsWith('/wikipedia/commons/thumb/')) return [primary];
    url.hostname = 'thumb.wikimedia.org';
    return [primary, url.toString()];
  } catch { return []; }
}
