// Optional network smoke test. Not part of npm test; calls public providers.
const assert = require('node:assert/strict');
const load = require('./load-ts.cjs');
const { parsePhotonResults } = load('supabase/functions/_shared/photon.ts');
const { loadDestinationInfo } = load('supabase/functions/_shared/destination-provider.ts');
(async () => {
  const response = await fetch('https://photon.komoot.io/api/?q=hyderabad&limit=6&lang=en');
  const found = parsePhotonResults((await response.json()).features);
  const india = found.find(p => p.country === 'India');
  const pakistan = found.find(p => p.country === 'Pakistan');
  assert.ok(india && pakistan, 'Namesake cities should both be offered');
  const details = await loadDestinationInfo(india);
  assert.ok(details.photo?.url && details.photo?.sourceUrl && details.photo?.license, 'Real credited destination photo');
  assert.match(details.overview, /Telangana|India/i);
  assert.ok(details.nearby.length > 0, 'Nearby places');
  assert.ok(details.bestTime && details.seasonSource, 'Local seasonal guidance');
  // Metadata alone previously passed while phones displayed blank image areas.
  for (const photo of [details.photo, ...details.nearby.map(p => p.photo)].filter(Boolean)) {
    const image = await fetch(photo.url, { signal: AbortSignal.timeout(15000) });
    assert.ok(image.ok && image.headers.get('content-type')?.startsWith('image/'), 'Photo URL must deliver image bytes');
    assert.ok((await image.arrayBuffer()).byteLength > 1000, 'Photo must not be empty');
  }
  console.log(JSON.stringify({ result: 'PASS', suggestionCountries: [...new Set(found.map(p => p.country))], photo: Boolean(details.photo), nearbyPlaces: details.nearby.map(p => p.name), seasonalGuide: Boolean(details.bestTime) }, null, 2));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
