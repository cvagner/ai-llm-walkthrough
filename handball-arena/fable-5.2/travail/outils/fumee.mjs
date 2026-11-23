// Essai de fumée : charge la page, joue un match IA contre IA en accéléré, résume les événements, prend une capture.
import { open, ROOT } from './lib.mjs';
import { join } from 'node:path';
const secs = +(process.argv[2] || 120);
const { browser, page, errors } = await open(1600, 900);
if (errors.length) { console.log('ERREURS AU CHARGEMENT\n' + errors.join('\n')); await browser.close(); process.exit(1); }
const res = await page.evaluate((secs) => {
  const hb = window.__hb, S = hb.S; hb.init(20261118, secs / 2, true);
  const t0 = performance.now(); let stuck = 0, lastX = 0, maxStuck = 0, n = 0;
  while (S.phase !== 'end' && n < secs * 60 * 4) { hb.step(1); n++; if (Math.abs(S.ball.x - lastX) < 1e-4) { stuck++; maxStuck = Math.max(maxStuck, stuck); } else stuck = 0; lastX = S.ball.x; }
  const c = {}; for (const e of S.ev) c[e.c] = (c[e.c] || 0) + 1;
  const nan = S.P.some(p => !isFinite(p.x + p.z + p.y) || p.J.some(v => !isFinite(v))) || !isFinite(S.ball.x + S.ball.y + S.ball.z);
  return { phase: S.phase, score: S.score.slice(), steps: n, simMs: Math.round(performance.now() - t0), maxStuckS: +(maxStuck / 60).toFixed(1), nan, events: c, gpu: (() => { const g = document.createElement('canvas').getContext('webgl2'); const x = g.getExtension('WEBGL_debug_renderer_info'); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : '?'; })() };
}, secs);
console.log(JSON.stringify(res, null, 1));
await page.evaluate(() => { const hb = window.__hb; hb.init(5, 300, true); hb.step(60 * 14); hb.cam(0); hb.render(); });
await page.screenshot({ path: join(ROOT, 'travail', 'fumee.png') });
if (errors.length) console.log('ERREURS\n' + errors.join('\n'));
await browser.close();
