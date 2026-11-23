// Assemble source/shell.html + source/js/*.js (dans l'ordre des noms) en un index.html autonome.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(join(here, 'js')).filter(f => f.endsWith('.js')).sort();
const js = files.map(f => `// ---- ${f}\n` + readFileSync(join(here, 'js', f), 'utf8')).join('\n');
const shell = readFileSync(join(here, 'shell.html'), 'utf8');
const out = shell.replace('/*__JS__*/', () => `(()=>{'use strict';\n${js}\n})();`);
writeFileSync(join(dirname(here), 'index.html'), out);
console.log(`index.html : ${Buffer.byteLength(out)} octets (${files.length} modules)`);
