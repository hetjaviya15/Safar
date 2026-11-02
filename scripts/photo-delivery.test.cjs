const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const load = require('./load-ts.cjs');
const { commonsPhotoUrls } = load('supabase/functions/_shared/photo-url.ts');
const { deliverPhoto } = load('supabase/functions/_shared/photo-delivery.ts');
const url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Charminar_Hyderabad_1.jpg/1280px-Charminar_Hyderabad_1.jpg?utm_source=wikipedia';

test('Commons delivery strips tracking, preserves exact file, and tries both hosts', () => {
  const urls = commonsPhotoUrls(url);
  assert.equal(urls.length, 2);
  assert.equal(new URL(urls[0]).hostname, 'upload.wikimedia.org');
  assert.equal(new URL(urls[1]).hostname, 'thumb.wikimedia.org');
  assert.equal(new URL(urls[0]).pathname, new URL(url).pathname);
  assert.equal(new URL(urls[0]).search, '');
});

test('photo fallback rejects arbitrary hosts, credentials, SVG, ports and traversal before fetch', async t => {
  let calls = 0; t.mock.method(globalThis, 'fetch', () => { calls++; });
  for (const invalid of ['http://upload.wikimedia.org/wikipedia/commons/a/aa/a.jpg', 'https://127.0.0.1/a.jpg', 'https://upload.wikimedia.org.evil.test/a.jpg', 'https://user@upload.wikimedia.org/wikipedia/commons/a/aa/a.jpg', 'https://upload.wikimedia.org:8443/wikipedia/commons/a/aa/a.jpg', 'https://upload.wikimedia.org/wikipedia/commons/a/aa/a.svg', 'https://upload.wikimedia.org/wikipedia/commons/a/aa/%2e%2e%2fsecret.jpg']) {
    assert.deepEqual(commonsPhotoUrls(invalid), []);
    await assert.rejects(deliverPhoto(invalid), /supported Wikimedia/);
  }
  assert.equal(calls, 0);
});

test('fallback returns real bytes and retries a failed image host without following redirects', async t => {
  const bytes = fs.readFileSync(require('node:path').join(__dirname, '../assets/photography/bali.jpg'));
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    assert.equal(options.redirect, 'error'); calls++;
    if (calls === 1) throw new Error('Host unavailable');
    return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } });
  });
  const result = await deliverPhoto(url);
  assert.equal(calls, 2);
  assert.deepEqual(Buffer.from(result.dataUri.split(',')[1], 'base64'), bytes);
});

test('fallback rejects HTML errors and oversized chunked images without trusting Content-Length', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>blocked</html>', { headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(deliverPhoto(url), /temporarily unavailable/);
  t.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array(2_000_001), { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '1' } }));
  await assert.rejects(deliverPhoto(url), /too large/);
});

test('photo endpoint keeps user authorization and rate reservation ahead of delivery', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../supabase/functions/safar-destinations/index.ts'), 'utf8');
  assert.ok(source.indexOf('authorizedBackend(request)') < source.indexOf("body.action === 'photo'"));
  assert.match(source, /reserve\(backend.admin, backend.user.id, 'destination'\)[\s\S]*deliverPhoto\(body.url/);
});
