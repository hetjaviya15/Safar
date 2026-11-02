const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const load = require('./load-ts.cjs');
const { colors, chartColors } = load('src/constants/palette.js');
const { buildTripHtml } = load('src/services/export.js');

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('Ocean Blue + Aqua brand and readable text/control pairs stay consistent', () => {
  assert.equal(colors.primary, '#0866C6');
  assert.equal(colors.accent, '#18C7BD');
  assert.equal(colors.highlight, '#FFCE66');
  assert.equal(colors.background, '#F5F9FD');
  const pairs = [
    ['surface', 'primary'], ['surface', 'ai'], ['surface', 'secondary'],
    ['surface', 'accentStrong'], ['onAccent', 'accent'], ['text', 'background'],
    ['text', 'accentSoft'], ['muted', 'surface'], ['muted', 'surfaceMuted'],
    ['muted', 'aiSoft'], ['placeholder', 'background'], ['ai', 'aiSoft'],
    ['primary', 'accentSoft'], ['danger', 'dangerSoft'], ['surface', 'danger'],
    ['warning', 'warningSoft'], ['success', 'surface'], ['highlight', 'navy'],
    ['terracotta', 'peachSoft'], ['meadow', 'meadowSoft'], ['surface', 'terracotta'], ['surface', 'meadow'],
  ];
  for (const [fg, bg] of pairs) {
    const ratio = contrast(colors[fg], colors[bg]);
    assert.ok(ratio >= 4.5, `${fg} on ${bg}: ${ratio.toFixed(2)}:1`);
  }
  assert.equal(new Set(chartColors).size, chartColors.length);
});

test('exported itineraries and native launch backgrounds use the new palette', () => {
  const html = buildTripHtml({ title: 'Safar', destination: 'Hyderabad', start_date: '2026-12-10', end_date: '2026-12-10', travelers: 1, budget: null }, { activities: [], bookings: [], expenses: [], packing: [], notes: [] });
  for (const token of ['primary', 'accent', 'accentSoft', 'text', 'muted', 'background']) {
    assert.ok(html.includes(colors[token]), `PDF includes ${token}`);
  }
  const { expo } = require('../app.json');
  assert.equal(expo.android.adaptiveIcon.backgroundColor, colors.background);
  assert.equal(expo.plugins.find(plugin => plugin[0] === 'expo-splash-screen')[1].backgroundColor, colors.background);
  assert.equal(expo.userInterfaceStyle, 'light');
});

test('screen source has no leftover teal/purple brand literals or legacy color tokens', () => {
  function check(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) check(file);
      else if (/\.([tj]sx?|css)$/.test(file)) {
        const source = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /#(?:087F75|05675F|00A896|183B41|12B8A6|DCCFFF|8257E6|F2EDFF|E9F8F5|F5FAF9)\b/i, file);
        assert.doesNotMatch(source, /colors\.(?:mint|emerald|sky|skySoft|sunset|coral|sunshine)\b/, file);
      }
    }
  }
  check(path.resolve(__dirname, '../src'));
});
