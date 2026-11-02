const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-ts.cjs');
const { fontForWeight, fontFamilies } = load('src/constants/typography.js');
const root = path.resolve(__dirname, '..');
const flatten = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));

function setup() {
  const rendered = [];
  const native = {
    StyleSheet: { flatten },
    Text: props => { rendered.push({ type: 'text', ...props }); return React.createElement('span', null, props.children); },
    TextInput: props => { rendered.push({ type: 'input', ...props }); return null; },
  };
  const source = fs.readFileSync(path.join(root, 'src/components/ui/Typography.jsx'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => name === 'react-native' ? native : name === '@/constants/typography' ? { fontForWeight } : require(name), mod, mod.exports);
  return { ...mod.exports, rendered };
}

test('static font weights use real Regular/Medium/Bold faces rather than synthetic heavy styles', () => {
  assert.equal(fontForWeight(), fontFamilies.regular);
  assert.equal(fontForWeight('normal'), fontFamilies.regular);
  assert.equal(fontForWeight(500), fontFamilies.medium);
  for (const weight of ['600', '700', '800', '900', 'bold']) assert.equal(fontForWeight(weight), fontFamilies.bold);
  for (const [label, weight] of [['Regular', 400], ['Medium', 500], ['Bold', 700]]) {
    const bytes = fs.readFileSync(path.join(root, `assets/fonts/GoogleSans-${label}.ttf`));
    assert.equal(bytes.readUInt32BE(0), 0x00010000);
    const tables = {};
    for (let i = 0; i < bytes.readUInt16BE(4); i++) {
      const offset = 12 + i * 16;
      tables[bytes.toString('ascii', offset, offset + 4)] = bytes.readUInt32BE(offset + 8);
    }
    assert.equal(tables.fvar, undefined, 'SDK 57 must receive static fonts');
    assert.equal(bytes.readUInt16BE(tables['OS/2'] + 4), weight);
  }
  assert.match(fs.readFileSync(path.join(root, 'assets/fonts/OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE/);
});

test('text keeps layout/accessibility/scaling props and inherits nested weight', () => {
  const { Text, TypographyReady, rendered } = setup();
  renderToStaticMarkup(React.createElement(TypographyReady.Provider, { value: true },
    React.createElement(Text, { style: [{ fontWeight: '900' }, { fontSize: 29, color: '#17324D' }], accessibilityLabel: 'Greeting', allowFontScaling: true },
      'Hello ', React.createElement(Text, null, 'Het'))));
  assert.equal(flatten(rendered[0].style).fontFamily, fontFamilies.bold);
  assert.equal(flatten(rendered[0].style).fontWeight, 'normal');
  assert.equal(flatten(rendered[0].style).fontSize, 29);
  assert.equal(rendered[0].accessibilityLabel, 'Greeting');
  assert.equal(rendered[0].allowFontScaling, true);
  assert.equal(flatten(rendered[1].style).fontFamily, fontFamilies.bold);
});

test('text inputs preserve refs and input handlers while choosing the label weight', () => {
  const { TextInput, TypographyReady, rendered } = setup();
  const ref = React.createRef(); const onChangeText = () => {}; const onFocus = () => {};
  renderToStaticMarkup(React.createElement(TypographyReady.Provider, { value: true }, React.createElement(TextInput, { ref, onChangeText, onFocus, secureTextEntry: true, value: 'test', style: { fontWeight: '500' } })));
  assert.equal(rendered[0].ref, ref);
  assert.equal(rendered[0].onFocus, onFocus);
  assert.equal(rendered[0].onChangeText, onChangeText);
  assert.equal(rendered[0].secureTextEntry, true);
  assert.equal(flatten(rendered[0].style).fontFamily, fontFamilies.medium);
});

test('unloaded fonts use the system fallback and explicit monospace remains unchanged', () => {
  const { Text, TypographyReady, rendered } = setup();
  renderToStaticMarkup(React.createElement(Text, { style: { fontWeight: '700' } }, 'Fallback'));
  assert.equal(flatten(rendered[0].style).fontFamily, undefined);
  assert.equal(flatten(rendered[0].style).fontWeight, '700');
  renderToStaticMarkup(React.createElement(TypographyReady.Provider, { value: true }, React.createElement(Text, { style: { fontFamily: 'monospace' } }, 'Code')));
  assert.equal(flatten(rendered[1].style).fontFamily, 'monospace');
});

test('app-owned native text is routed through the typography components', () => {
  function scan(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!file.endsWith('.jsx') || file.endsWith('/ui/Typography.jsx')) continue;
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
    for (const node of ast.statements) {
      if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== 'react-native') continue;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) assert.ok(!bindings.elements.some(e => ['Text', 'TextInput'].includes((e.propertyName ?? e.name).text)), file);
    }
  } }
  scan(path.join(root, 'src'));
});
