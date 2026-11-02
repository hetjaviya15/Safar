const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-ts.cjs');
const catalog = load('src/constants/travel-photos.js');
const palette = load('src/constants/palette.js');
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

// Structural render tests, not a substitute for native Yoga/device visual QA.
function renderComponent(file, props, extra = {}) {
  const images = [];
  const views = [];
  const native = {
    StyleSheet: { create: s => s, absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } },
    View: props => { views.push(props); return React.createElement('div', null, props.children); },
    Text: ({ children }) => React.createElement('span', null, children),
    Pressable: ({ children }) => React.createElement('button', null, children),
    Image: props => { images.push(props); return null; },
    ActivityIndicator: () => null,
    Modal: ({ visible, children }) => visible ? React.createElement('div', null, children) : null,
    Linking: { openURL() {} },
    Animated: { Value: class { setValue() {} stopAnimation() {} interpolate() { return 0; } }, View: ({ children }) => React.createElement('div', null, children), timing: () => ({ start(callback) { callback?.({ finished: true }); } }) },
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  };
  const mocks = {
    'react-native': native,
    '@/components/ui/Typography': { Text: native.Text },
    '@/constants/travel-photos': catalog,
    '@/constants/theme': palette,
    '@/services/destination-info': { loadDestinationInfo: () => { throw new Error('Unexpected network request'); } },
    '@/services/places': { hasCoordinates: () => false },
    '@/services/photo-delivery': { commonsPhotoUrls: load('supabase/functions/_shared/photo-url.ts').commonsPhotoUrls, loadPhotoFallback: () => { throw new Error('Unexpected photo fallback'); } },
    './ui/Icon': { Icon: () => null },
    './ui/CustomModal': { useDialog: () => ({ alert() {} }) },
    ...extra,
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components', file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const mod = { exports: {} };
  const localRequire = name => name.endsWith('.jpg') ? 1 : mocks[name] ?? require(name);
  new Function('require', 'module', 'exports', js)(localRequire, mod, mod.exports);
  const Component = mod.exports[path.basename(file).replace(/\.[tj]sx?$/, '')];
  const markup = renderToStaticMarkup(React.createElement(Component, props));
  return { images, views, markup };
}

test('bundled photos override intrinsic dimensions in cards and hero containers', () => {
  for (const photo of catalog.travelPhotos) {
    for (const style of [{ width: 190, height: 160 }, { width: '100%', aspectRatio: 1.55 }, { flex: 1 }]) {
      const { images } = renderComponent('TravelPhoto.jsx', { photoId: photo.id, style });
      assert.equal(images.length, 1);
      const image = images[0];
      assert.equal(typeof image.source, 'number');
      // RN Image.android.js prepends the asset's width/height to the user style.
      const nativeStyle = flatten([{ width: 1280, height: 1208 }, image.style]);
      assert.equal(nativeStyle.width, '100%');
      assert.equal(nativeStyle.height, '100%');
      assert.equal(nativeStyle.position, 'absolute');
      assert.equal(image.resizeMode, 'cover');
    }
  }
});

test('remote photos share the sizing fix; missing photos retain an honest placeholder', () => {
  const photo = { ...catalog.travelPhotos[0], url: 'https://example.org/real-photo.jpg' };
  const { images } = renderComponent('TravelPhoto.jsx', { photo });
  assert.deepEqual(images[0].source, { uri: photo.url });
  assert.equal(flatten(images[0].style).width, '100%');
  assert.equal(flatten(images[0].style).height, '100%');
  const missing = renderComponent('TravelPhoto.jsx', {});
  assert.equal(missing.images.length, 0);
  assert.match(missing.markup, /Destination photo unavailable/);
});

test('Home reserves an unobstructed photo region with CTA outside the photo', () => {
  const photos = [];
  const { markup, views } = renderComponent('HomeTravelHero.jsx', {}, {
    'expo-router': { useFocusEffect() {}, router: { push() {} } },
    '@/utils/photo-rotation': load('src/utils/photo-rotation.js'),
    './TravelPhoto': { TravelPhoto: props => {
      photos.push(props);
      return React.createElement('section', null, props.children);
    } },
    './ui/Button': { Button: ({ label }) => React.createElement('button', null, label) },
  });
  assert.equal(photos.length, 1);
  const photoStage = views.find(view => flatten(view.style).aspectRatio > 0);
  assert.ok(photoStage);
  assert.ok(flatten(photoStage.style).minHeight >= 180);
  assert.equal(flatten(photos[0].style).position, 'absolute');
  const photoMarkup = renderToStaticMarkup(React.createElement(React.Fragment, null, photos[0].children));
  assert.doesNotMatch(photoMarkup, /Plan a trip|A little further/);
  assert.match(markup, /Plan a trip/);
});

test('shared photographs do not show an info badge over the image', () => {
  const { markup } = renderComponent('TravelPhoto.jsx', { photoId: 'bali' });
  assert.doesNotMatch(markup, /ⓘ|View source and license/);
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/TravelPhoto.jsx'), 'utf8');
  assert.doesNotMatch(source, /attributionButton|attributionOpen/);
});

test('destination search keeps suggestions and keyboard submission without an arrow button', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/DestinationSearch.jsx'), 'utf8');
  assert.doesNotMatch(source, /name="next"|accessibilityLabel="Search"/);
  assert.match(source, /onSubmitEditing/);
  assert.match(source, /returnKeyType="search"/);
  assert.match(source, /onPress=\{\(\) => choose\(item\)\}/);
  assert.match(source, /accessibilityLabel="Clear search"/);
});
