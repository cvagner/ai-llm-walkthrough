// Capture du menu d'accueil et du menu de pause. Usage : node menu.mjs <dossier>
import { open, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
const out = join(ROOT, process.argv[2] || 'travail/rendus/menu'); mkdirSync(out, { recursive: true });
const { browser, page } = await open(1600, 900, '');
await page.waitForSelector('#panel h1'); await page.waitForTimeout(600); await page.screenshot({ path: join(out, 'menu-accueil.png') });
await browser.close();
