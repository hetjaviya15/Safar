const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-ts.cjs');
const date = load('src/utils/date.js');
const places = load('src/services/places.js');
const pdf = load('src/services/export.js');

test('inclusive trip duration is stable across daylight saving and leap days', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['UTC', 'America/New_York', 'Asia/Kolkata', 'Europe/Berlin']) {
      process.env.TZ = zone;
      assert.equal(date.tripDuration('2026-03-07', '2026-03-09'), 3, zone);
      assert.equal(date.tripDuration('2026-10-31', '2026-11-02'), 3, zone);
      assert.equal(date.tripDuration('2028-02-28', '2028-03-01'), 3, zone);
      assert.equal(date.tripDuration('2026-12-10', '2026-12-10'), 1, zone);
      assert.equal(date.toDateKey(date.parseDateKey('2026-12-10')), '2026-12-10');
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test('destination route parser handles invalid and custom locations', () => {
  assert.equal(places.parseDestination('{bad'), null);
  assert.equal(places.parseDestination('{"name":"Delhi"}'), null);
  const custom = { placeId: 'custom-delhi', name: 'Delhi', displayName: 'Delhi, India' };
  assert.deepEqual(places.parseDestination(JSON.stringify(custom)), custom);
  assert.equal(places.hasCoordinates(custom), false);
});
test('map coordinates accept zero and reject missing or invalid pairs', () => {
  assert.equal(places.hasCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(places.hasCoordinates({ latitude: 91, longitude: 0 }), false);
  assert.equal(places.hasCoordinates({ latitude: 20, longitude: null }), false);
  assert.equal(places.hasCoordinates({ latitude: '20', longitude: 20 }), false);
  assert.equal(places.hasCoordinates({ latitude: NaN, longitude: 20 }), false);
});
test('directions preserve destination context and escape query text', () => {
  const url = new URL(places.directionsUrl('Museum & Cafe', 'Delhi, India'));
  assert.equal(url.searchParams.get('query'), 'Museum & Cafe, Delhi, India');
});
test('custom trip has no fabricated map coordinates or curated guide', () => {
  const d = places.destinationFromTrip({ id: 'trip', destination: 'Delhi, India', destination_lat: null, destination_lon: null });
  assert.equal(d.name, 'Delhi');
  assert.equal(places.hasCoordinates(d), false);
  assert.equal(places.guides[d.placeId], undefined);
});
test('PDF content escapes user text and includes workspace sections', () => {
  const trip = { title: '<script>unsafe</script>', destination: 'Delhi & Agra', start_date: '2026-12-10', end_date: '2026-12-11', travelers: 2, budget: 100, currency: 'USD' };
  const html = pdf.buildTripHtml(trip, {
    activities: [{ day_number: 1, sort_order: 2, title: 'Later', notes: '<img onerror=bad>' }, { day_number: 1, sort_order: 1, title: 'Earlier' }],
    bookings: [{ booking_type: 'hotel', provider: 'Hotel', reference: '<secret>', status: 'confirmed' }],
    expenses: [{ title: 'Lunch', category: 'Food', amount: 10, currency: 'USD' }, { title: 'Train', category: 'Travel', amount: 20, currency: 'EUR' }],
    packing: [{ name: 'Passport', quantity: 1, is_packed: true }], notes: [{ title: 'Notes', body: 'Line 1\nLine 2' }],
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img onerror'));
  assert.ok(html.includes('&lt;secret&gt;'));
  assert.ok(html.indexOf('Earlier') < html.indexOf('Later'));
  for (const value of ['Day 2', 'Spent: USD 10', 'Spent: EUR 20', 'Packing list', 'Line 1<br/>Line 2']) assert.ok(html.includes(value), value);
});
test('empty PDF includes truthful empty sections', () => {
  const html = pdf.buildTripHtml({ title: 'Trip', destination: 'Custom', start_date: '2026-12-10', end_date: '2026-12-10', travelers: 1, budget: null }, { activities: [], bookings: [], expenses: [], packing: [], notes: [] });
  assert.ok(html.includes('No bookings saved.'));
  assert.ok(html.includes('Budget: Not set'));
  assert.ok(html.includes('A day to make your own.'));
});
test('base64 binary decoder converts base64 payloads to byte arrays accurately', () => {
  const { base64ToUint8Array } = load('src/utils/binary.js');
  const sample = 'Safar journey travel planner 2026';
  const encoded = Buffer.from(sample).toString('base64');
  const decoded = base64ToUint8Array(encoded);
  assert.equal(Buffer.from(decoded).toString('utf8'), sample);
  assert.equal(decoded instanceof Uint8Array, true);
  assert.equal(decoded.byteLength, Buffer.from(sample).length);

  // Test padding edge cases
  for (const str of ['a', 'ab', 'abc', 'abcd', 'abcde', '🎉🚀🌍']) {
    const b64 = Buffer.from(str).toString('base64');
    const dec = base64ToUint8Array(b64);
    assert.equal(Buffer.from(dec).toString('utf8'), str);
  }
});

