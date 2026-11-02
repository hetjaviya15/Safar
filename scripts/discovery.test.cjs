const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-ts.cjs');
const { parsePhotonResults } = load('supabase/functions/_shared/photon.ts');
const { plainText, distanceKm } = load('supabase/functions/_shared/destination-provider.ts');
const fs = require('node:fs');
const path = require('node:path');
test('autocomplete preserves coordinates and country and filters invalid results', () => {
  const feature = { properties: { name: 'Hyderabad', country: 'India', state: 'Telangana', osm_id: 123, osm_type: 'R' }, geometry: { coordinates: [78.47, 17.36] } };
  const results = parsePhotonResults([feature, feature, { properties: { name: 'Bad' }, geometry: { coordinates: [200, 95] } }]);
  assert.equal(results.length, 1);
  assert.equal(results[0].latitude, 17.36);
  assert.equal(results[0].longitude, 78.47);
  assert.equal(results[0].displayName, 'Hyderabad, Telangana, India');
});
test('photo and guide attribution is rendered as plain text, not HTML', () => {
  assert.equal(plainText('<script>alert(1)</script><b>Artist &amp; author</b>'), 'Artist & author');
  assert.equal(plainText('<style>body {color:red}</style><p>October &nbsp; to March</p>'), 'October to March');
});
test('coordinate distance separates namesake cities', () => {
  assert.equal(distanceKm(17.36, 78.47, 17.36, 78.47), 0);
  assert.ok(distanceKm(17.36, 78.47, 25.38, 68.37) > 1000);
});

test('destination cache is checked before provider quota is reserved', () => {
  const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/safar-destinations/index.ts'), 'utf8');
  const cacheRead = source.indexOf("from('destination_cache').select('payload,expires_at')");
  const quotaReservation = source.indexOf('const reservation = await reserve(backend.admin, backend.user.id, details ?');
  assert.ok(cacheRead >= 0 && quotaReservation > cacheRead, 'fresh cache hits must not spend provider quota');
});

test('Explore submitted and routed searches use the same Photon suggestion service as Home', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app/explore.jsx'), 'utf8');
  assert.match(source, /import \{ suggestDestinations \} from '\@\/services\/autocomplete'/);
  assert.equal((source.match(/suggestDestinations\(/g) ?? []).length, 2);
  assert.doesNotMatch(source, /searchDestinations\(/);
});
