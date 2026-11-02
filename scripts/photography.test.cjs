const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const load = require('./load-ts.cjs');
const { travelPhotos, curatedPhoto } = load('src/constants/travel-photos.js');
const { HOME_PHOTO_IDS, PHOTO_ROTATION_MS, nextPhotoIndex, startPhotoRotation } = load('src/utils/photo-rotation.js');

test('Home rotates five distinct photos every five seconds, loops, and cleans up', t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  assert.equal(PHOTO_ROTATION_MS, 5000);
  assert.equal(HOME_PHOTO_IDS.length, 5);
  assert.equal(new Set(HOME_PHOTO_IDS).size, 5);
  let index = 0;
  const stop = startPhotoRotation(() => { index = nextPhotoIndex(index, HOME_PHOTO_IDS.length); });
  t.mock.timers.tick(4999); assert.equal(index, 0);
  t.mock.timers.tick(1); assert.equal(index, 1);
  t.mock.timers.tick(5000 * 4); assert.equal(index, 0);
  stop(); t.mock.timers.tick(5000); assert.equal(index, 0);
  assert.equal(nextPhotoIndex(0, 0), 0);
});

test('real photo catalog has attribution, local JPEGs, and exact-place matching', () => {
  for (const photo of travelPhotos) {
    assert.ok(photo.credit && photo.license && photo.licenseUrl);
    assert.equal(new URL(photo.sourceUrl).hostname, 'commons.wikimedia.org');
    const bytes = fs.readFileSync(path.resolve(__dirname, `../assets/photography/${photo.id}.jpg`));
    assert.equal(bytes.subarray(0, 2).toString('hex'), 'ffd8');
    assert.equal(curatedPhoto({ placeId: 'test', name: photo.name, displayName: `${photo.name}, ${photo.country}`, latitude: photo.latitude, longitude: photo.longitude })?.id, photo.id);
  }
  assert.equal(curatedPhoto({ placeId: 'custom', name: 'Paris', displayName: 'Paris' }), undefined);
  assert.equal(curatedPhoto({ placeId: 'texas', name: 'Paris', displayName: 'Paris, Texas, United States', latitude: 33.66, longitude: -95.55 }), undefined);
  assert.equal(curatedPhoto({ placeId: 'custom', name: 'Paris', displayName: 'Paris, France' })?.id, 'paris');
  assert.equal(curatedPhoto({ placeId: 'custom', name: 'New Paris', displayName: 'New Paris, France' }), undefined);
});

test('generated mountain fallback is no longer referenced and supplied logo is wired', () => {
  const root = path.resolve(__dirname, '../src');
  function check(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, item.name); if (item.isDirectory()) check(file); else if (/\.[tj]sx?$/.test(file)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /safar-mountain-hero|images\.unsplash\.com/); } }
  check(root);
  const { expo } = require('../app.json');
  assert.equal(expo.icon, './assets/images/safar-logo.png');
  assert.equal(expo.android.adaptiveIcon.foregroundImage, expo.icon);
  assert.equal(expo.ios.icon, expo.icon);
  const home = fs.readFileSync(path.join(root, 'components/HomeTravelHero.jsx'), 'utf8');
  assert.match(home, /useFocusEffect/); assert.match(home, /AppState.addEventListener/); assert.match(home, /listener.remove/);
});
