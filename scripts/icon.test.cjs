const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-ts.cjs');

// Match Metro's web resolution for the real Lucide/SVG rendering pipeline.
// Only SVG elements are needed; its top-level entry also imports native helpers.
const originalLoad = Module._load;
let lucide;
let theme;
try {
  Module._load = function (name, parent, main) {
    if (name === 'react-native') name = 'react-native-web';
    if (name === 'react-native-svg') name = require.resolve('react-native-svg/lib/commonjs/elements.web.js');
    return originalLoad.call(this, name, parent, main);
  };
  lucide = require('lucide-react-native');
  theme = load('src/constants/theme.js');
} finally {
  Module._load = originalLoad;
}

function loadIcon(platform) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/ui/Icon.jsx'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} };
  const localRequire = name => {
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === 'lucide-react-native') return lucide;
    if (name === '@/constants/theme') return theme;
    return require(name);
  };
  new Function('require', 'module', 'exports', js)(localRequire, mod, mod.exports);
  return mod.exports.Icon;
}

test('web icons render real SVG without React warnings or native accessibility attributes', () => {
  const Icon = loadIcon('web');
  const errors = [];
  const originalError = console.error;
  try {
    console.error = (...args) => errors.push(args);
    for (const name of ['mountain', '✈', 'unknown-icon']) {
      const markup = renderToStaticMarkup(React.createElement(Icon, { name, size: 28, color: '#087F75' }));
      assert.match(markup, /<svg/);
      assert.match(markup, /aria-hidden="true"/);
      // React Native Web translates focusable=false into exclusion from tab order.
      assert.match(markup, /tabindex="-1"/);
      assert.match(markup, /width="28"/);
      assert.match(markup, /stroke="#087F75"/);
      assert.doesNotMatch(markup, /accessibilityElementsHidden|importantForAccessibility/);
    }
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(errors, []);
});

test('mobile icons retain native accessibility props, aliases and fallback', () => {
  for (const platform of ['android', 'ios']) {
    const Icon = loadIcon(platform);
    const icon = Icon({ name: '✈' });
    assert.equal(icon.type, lucide.Plane);
    assert.equal(icon.props.accessibilityElementsHidden, true);
    assert.equal(icon.props.importantForAccessibility, 'no');
    assert.equal(icon.props['aria-hidden'], undefined);
    assert.equal(Icon({ name: 'unknown-icon' }).type, lucide.Compass);
  }
});
