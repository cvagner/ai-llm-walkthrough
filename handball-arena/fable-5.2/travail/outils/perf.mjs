// Performance : séquence de 60 s (3600 images) rendue image par image avec gl.finish(), temps mur par image (simulation + rendu + GPU).
import { open, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
const W = +(process.argv[2] || 1920), H = +(process.argv[3] || 1080);
const { browser, page, errors } = await open(W, H);
const r = await page.evaluate(() => {
  const hb = __hb, S = hb.S; hb.init(20261118, 300, true); hb.step(180); hb.cam(0); for (let i = 0; i < 30; i++) hb.render();
  const sim = [], ren = []; const tq = !!document.createElement('canvas').getContext('webgl2').getExtension('EXT_disjoint_timer_query_webgl2');
  for (let f = 0; f < 3600; f++) { const a = performance.now(); hb.step(1); const b = performance.now(); hb.render(); const c = performance.now(); sim.push(b - a); ren.push(c - b); }
  const st = v => { const s = v.slice().sort((x, y) => x - y); return { moyenne: +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(2), p99: +s[Math.floor(s.length * 0.99)].toFixed(2), max: +s[s.length - 1].toFixed(2), au_dessus_16_7: v.filter(x => x > 16.7).length }; };
  const g = document.createElement('canvas').getContext('webgl2'), x = g.getExtension('WEBGL_debug_renderer_info');
  return { gpu: x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : '?', requetes_temps_gpu: tq, simulation_ms: st(sim), rendu_ms: st(ren), heap: performance.memory ? performance.memory.usedJSHeapSize : null };
});
r.resolution = `${W}×${H}`; console.log(JSON.stringify(r, null, 1));
writeFileSync(join(ROOT, 'travail', `rapport-perf-${W}x${H}.json`), JSON.stringify(r, null, 1));
await browser.close();
