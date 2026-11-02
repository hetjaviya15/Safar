const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');

function setup(file = 'destination-info.js') {
  const requests = [];
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => ({ invokeBackend: (_name, body) => new Promise((resolve, reject) => requests.push({ body, resolve, reject })) }), mod, mod.exports);
  return { load: mod.exports.loadDestinationInfo ?? mod.exports.loadPhotoFallback, requests };
}
const place = id => ({ placeId: id, name: id, displayName: id, latitude: 17, longitude: 78 });
const settle = () => new Promise(resolve => setImmediate(resolve));

test('photo/details requests coalesce per place and limit concurrency to two', async () => {
  const { load, requests } = setup();
  const a = load(place('a')); const duplicate = load(place('a'));
  const b = load(place('b')); const c = load(place('c'));
  assert.equal(requests.length, 2);
  requests[0].resolve({ nearby: [], photo: { url: 'real.jpg' } });
  await settle(); assert.equal(requests.length, 3);
  requests[1].resolve({ nearby: [] }); requests[2].resolve({ nearby: [] });
  assert.deepEqual(await a, await duplicate);
  await Promise.all([b, c]);
  await load(place('a')); assert.equal(requests.length, 3, 'cached photo must not refetch');
});

test('cancelling one consumer does not abort another card sharing its photo', async () => {
  const { load, requests } = setup(); const controller = new AbortController();
  const cancelled = load(place('a'), controller.signal); const other = load(place('a'));
  controller.abort(); const rejection = assert.rejects(cancelled, /cancelled/);
  requests[0].resolve({ nearby: [] });
  await rejection; assert.deepEqual(await other, { nearby: [] });
  await assert.rejects(load(place('unstarted'), controller.signal), /cancelled/);
  assert.equal(requests.length, 1);
});

test('failed photo requests release their slot and can be retried', async () => {
  const { load, requests } = setup();
  const failed = assert.rejects(load(place('a')), /offline/);
  requests[0].reject(new Error('offline')); await failed;
  const retry = load(place('a')); assert.equal(requests.length, 2);
  requests[1].resolve({ nearby: [] }); assert.deepEqual(await retry, { nearby: [] });
});

test('binary photo fallback coalesces requests, limits concurrency and caches results', async () => {
  const { load, requests } = setup('photo-delivery.js');
  const a = load('a'); const duplicate = load('a'); const b = load('b'); const c = load('c');
  const dataUri = 'data:image/jpeg;base64,/9j/';
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body.action, 'photo');
  requests[0].resolve({ dataUri }); await settle();
  assert.equal(requests.length, 3);
  requests[1].resolve({ dataUri }); requests[2].resolve({ dataUri });
  assert.deepEqual(await Promise.all([a, duplicate, b, c]), Array(4).fill(dataUri));
  await load('a'); assert.equal(requests.length, 3);
});

test('binary fallback rejects invalid payloads and allows retry after failure', async () => {
  const { load, requests } = setup('photo-delivery.js');
  const failed = assert.rejects(load('a'), /Photo could not load/);
  requests[0].resolve({ dataUri: 'javascript:invalid' }); await failed;
  const retry = load('a'); requests[1].resolve({ dataUri: 'data:image/jpeg;base64,/9j/' });
  assert.match(await retry, /^data:image\/jpeg/);
});
