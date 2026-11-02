// Package only Git-visible source, with an additional denylist and secret scan.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || path.join(root, '..', 'safar-release-source-20261021.zip'));
if (fs.existsSync(output)) throw new Error('Refusing to overwrite an existing archive.');
const files = cp.execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const allowed = files.filter(f => !/(^|\/)(node_modules|\.git|\.expo|\.temp|dist[^/]*|web-build)(\/|$)/.test(f) && !/(^|\/)\.env(?!\.example$)/.test(f) && !/\.(zip|pem|key|p12|p8|jks|mobileprovision|tsbuildinfo)$/.test(f) && !f.includes('\n'));
for (const f of allowed) {
  const stat = fs.lstatSync(path.join(root, f)); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Unexpected source file: ' + f);
  const source = fs.readFileSync(path.join(root, f), 'utf8');
  if (/gsk_[A-Za-z0-9]{24,}|sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source)) throw new Error('Possible secret in ' + f);
  for (const jwt of source.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try { if (JSON.parse(Buffer.from(jwt[1], 'base64url').toString()).role === 'service_role') throw new Error('Service-role credential in ' + f); }
    catch (e) { if (e.message.startsWith('Service-role')) throw e; }
  }
}
cp.execFileSync('zip', ['-q', output, '-@'], { cwd: root, input: allowed.join('\n') + '\n' });
cp.execFileSync('unzip', ['-tq', output]);
console.log(JSON.stringify({ output, files: allowed.length, bytes: fs.statSync(output).size, integrity: 'PASS', secretsAndDependenciesExcluded: true }, null, 2));
