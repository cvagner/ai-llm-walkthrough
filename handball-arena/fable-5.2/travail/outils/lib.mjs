// Ouvre index.html?test dans Chrome sans fenêtre, avec le GPU matériel (WebGL2 via ANGLE).
import { chromium } from 'playwright-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export async function open(w = 1920, h = 1080, query = '?test') {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=default', '--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(pathToFileURL(join(ROOT, 'index.html')).href + query);
  await page.waitForFunction(() => document.title === 'pret' || document.getElementById('err').style.display === 'flex', null, { timeout: 20000 }).catch(() => {});
  const err = await page.evaluate(() => document.getElementById('err').textContent);
  if (err) errors.push(err);
  return { browser, page, errors };
}
