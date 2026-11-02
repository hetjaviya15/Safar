const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-ts.cjs');
const { validResult, validDate, readyToPropose } = load('supabase/functions/_shared/ai-validation.ts');
const { readBody, readTextLimited } = load('supabase/functions/_shared/http.ts');
const { validDestination, withinBounds } = load('supabase/functions/_shared/geo.ts');
function result() {
  const state = { destination: 'Hyderabad, India', startDate: '2026-12-10', endDate: '2026-12-12', travelers: 2, budget: null, currency: 'INR', noBudgetLimit: true, interests: [] };
  return { assistantMessage: 'Please review this plan.', status: 'proposal', missingFields: [], state, trip: { ...state, title: 'Hyderabad trip', travelerType: 'Friends' },
    activities: [{ dayNumber: 1, title: 'Charminar', location: 'Hyderabad', startsAt: '10:00', notes: null, estimatedCost: null, sortOrder: 0 }], packingItems: [], budgetTips: [], assumptions: [] };
}
test('AI validates nested data and real dates, not just array presence', () => {
  assert.equal(validResult(result()), true);
  for (const mutate of [r => r.activities = [null], r => r.activities[0].estimatedCost = -1, r => r.trip.travelers = 999, r => r.state.startDate = '2026-02-30', r => r.activities[0].startsAt = '29:00', r => r.packingItems = [{ name: 'Passport', quantity: 0, category: 'Essentials' }], r => r.extra = 'unexpected']) {
    const value = result(); mutate(value); assert.equal(validResult(value), false);
  }
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
});
test('AI follow-up questions never become proposals and activities stay in range', () => {
  const value = result(); assert.equal(readyToPropose(value), true);
  value.status = 'needs_input'; assert.equal(readyToPropose(value), false);
  value.status = 'proposal'; value.activities[0].dayNumber = 4; assert.equal(readyToPropose(value), false);
});
test('streaming limits reject oversized bodies without trusting Content-Length', async () => {
  await assert.rejects(readTextLimited(new Response('a'.repeat(20)), 10), /too large/);
  await assert.rejects(readBody(new Request('https://example.test', { method: 'POST', body: '[]' })), /valid request/);
  await assert.rejects(readBody(new Request('https://example.test', { method: 'POST', body: '{bad' })), /JSON/);
  assert.deepEqual(await readBody(new Request('https://example.test', { method: 'POST', body: '{"request":"hello"}' })), { request: 'hello' });
});
test('geographic bounds validate regions and antimeridian without mixing namesakes', () => {
  const d = { placeId: 'test', name: 'Hyderabad', displayName: 'Hyderabad, India', latitude: 17.36, longitude: 78.47, bounds: [78, 17, 79, 18] };
  assert.equal(validDestination(d), true); assert.equal(withinBounds(25.38, 68.37, d.bounds), false);
  assert.equal(withinBounds(17.36, 78.47, d.bounds), true);
  assert.equal(withinBounds(0, 179, [170, -10, -170, 10]), true);
  assert.equal(withinBounds(0, 0, [170, -10, -170, 10]), false);
  assert.equal(validDestination({ ...d, bounds: [78, 18, 79, 17] }), false);
  assert.equal(validDestination({ ...d, latitude: 95 }), false);
});
