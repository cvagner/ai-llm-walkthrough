// Séquence scénarisée de 60 s (match IA contre IA, graine fixe), capturée image par image au pas de 1/60 s.
// Usage : node sequence.mjs <dossier> [largeur hauteur]  → images échantillonnées, rafales, sequence.mp4 à la racine.
import { open, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = join(ROOT, process.argv[2] || 'travail/sequence'); const W = +(process.argv[3] || 1920), H = +(process.argv[4] || 1080);
mkdirSync(out, { recursive: true }); const fr = join(out, '_images'); rmSync(fr, { recursive: true, force: true }); mkdirSync(fr, { recursive: true });
const { browser, page, errors } = await open(W, H);
await page.evaluate(() => { const hb = __hb; hb.init(20261118, 300, true); hb.step(60 * 3); hb.hud(true); hb.cam(0); });
const N = 3600, bursts = {}; let t0 = Date.now();
for (let f = 0; f < N; f++) {
  const tag = await page.evaluate(() => { const hb = __hb, S = hb.S; hb.step(1); hb.render(); const h = S.ball.state === 0 ? S.P[S.ball.holder] : null; if (S.P.some(p => p.act === 1 && !p.released && p.at > 0.05)) return 'tir'; if (S.P.some(p => p.act === 4 && p.at > p.svR)) return 'parade'; if (h && h.contact > 0) return 'contact'; if (h && Math.hypot(h.vx, h.vz) > 5) return 'course'; return ''; });
  await page.screenshot({ path: join(fr, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
  if (tag && bursts[tag] === undefined && f > 60 && f < N - 14) bursts[tag] = f;
}
console.log(`capture : ${((Date.now() - t0) / 1000).toFixed(0)} s, rafales : ${JSON.stringify(bursts)}`);
const img = f => join(fr, String(f).padStart(5, '0') + '.jpg');
for (let s = 0; s < 6; s++) { const files = []; for (let k = 0; k < 20; k++) files.push(img((s * 20 + k) * 30)); execFileSync('montage', [...files, '-resize', '480x', '-tile', '5x', '-geometry', '+2+2', '-quality', '80', join(out, `sequence-${String(s * 10).padStart(2, '0')}s-${s * 10 + 10}s.jpg`)]); }
for (const [tag, f0] of Object.entries(bursts)) { const files = []; for (let k = 0; k < 12; k++) files.push(img(f0 + k)); execFileSync('montage', [...files, '-resize', '800x', '-tile', '4x', '-geometry', '+2+2', '-quality', '85', join(out, `rafale-${tag}.jpg`)]); }
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', join(fr, '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', join(ROOT, 'sequence.mp4')]);
rmSync(fr, { recursive: true, force: true });
if (errors.length) console.log('ERREURS\n' + errors.join('\n'));
await browser.close();
