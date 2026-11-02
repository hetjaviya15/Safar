const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function resolvePath(target) {
  if (fs.existsSync(target)) return target;
  for (const ext of ['.js', '.jsx', '.ts', '.tsx']) {
    if (fs.existsSync(target + ext)) return target + ext;
  }
  const withoutExt = target.replace(/\.[tj]sx?$/, '');
  for (const ext of ['.js', '.jsx', '.ts', '.tsx']) {
    if (fs.existsSync(withoutExt + ext)) return withoutExt + ext;
  }
  return target;
}

module.exports = function load(relative) {
  const file = resolvePath(path.resolve(__dirname, '..', relative));
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} };
  const localRequire = name => {
    if (name.startsWith('@/')) {
      const sub = name.slice(2);
      const target = resolvePath(path.resolve(__dirname, '..', 'src', sub));
      const rel = path.relative(path.resolve(__dirname, '..'), target);
      return module.exports(rel);
    }
    if (name.startsWith('.')) {
      const target = resolvePath(path.resolve(path.dirname(file), name));
      const rel = path.relative(path.resolve(__dirname, '..'), target);
      return module.exports(rel);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', js)(localRequire, mod, mod.exports);
  return mod.exports;
};
