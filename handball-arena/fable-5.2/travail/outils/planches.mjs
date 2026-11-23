// Planches pour le critique handball : chaque combinaison en vue tactique (postes étiquetés), chaque tir en rafale rapprochée.
// Usage : node planches.mjs <dossier>
import { open, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = join(ROOT, process.argv[2] || 'travail/planches'); mkdirSync(out, { recursive: true });
const tmp = join(out, '_tmp'); mkdirSync(tmp, { recursive: true });
const { browser, page, errors } = await open(1280, 720);
await page.addStyleTag({ content: '.lb{position:fixed;font:700 13px system-ui;padding:1px 5px;border-radius:4px;transform:translate(-50%,-150%);z-index:9;white-space:nowrap}.a{background:#fff;color:#033}.d{background:#b01020;color:#fff}.tt{position:fixed;left:10px;top:8px;font:700 20px system-ui;color:#fff;background:rgba(0,0,0,.7);padding:3px 10px;border-radius:5px;z-index:9}' });
const labels = (title) => page.evaluate((title) => {
  document.querySelectorAll('.lb,.tt').forEach(e => e.remove()); const hb = __hb, S = hb.S, R = ['GB', 'ALG', 'ARG', 'DC', 'ARD', 'ALD', 'PVT'];
  hb.render();
  for (let i = 0; i < 14; i++) { const p = S.P[i]; if (p.off) continue; const [x, y] = hb.project(p.x, 0, p.z), d = document.createElement('div'); d.className = 'lb ' + (p.team ? 'd' : 'a'); d.textContent = (p.team ? 'déf ' : '') + R[p.role] + (S.ball.state === 0 && S.ball.holder === i ? ' ●' : ''); d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); }
  const t = document.createElement('div'); t.className = 'tt'; t.textContent = title; document.body.appendChild(t);
}, title);
const combos = await page.evaluate(() => __hb.COMBOS.map(c => ({ k: c.k, n: c.n, v: c.variants.map(v => v.n) })));
for (let i = 0; i < combos.length; i++) for (let j = 0; j < combos[i].v.length; j++) {
  await page.evaluate(([i, j]) => { const hb = __hb; hb.hud(false); hb.train('combo', i, j); hb.step(2); hb.setCam(10.5, 14.4, 3.0, 10.5, 0, 0.3, 1.2); }, [i, j]);
  const files = [];
  for (let f = 0; f < 16; f++) {
    await labels(`t = ${(f * 0.3).toFixed(1)} s`); const fn = join(tmp, `c${f}.png`); await page.screenshot({ path: fn }); files.push(fn);
    const stop = await page.evaluate(() => { const hb = __hb, S = hb.S; for (let k = 0; k < 18; k++) { if (S.train.reset > 0 && S.train.reset < 0.25) return true; hb.step(1); } return false; }); if (stop) break;
  }
  execFileSync('montage', [...files, '-resize', '640x', '-tile', '4x', '-geometry', '+3+3', '-quality', '82', join(out, `combinaison-${combos[i].k}-variante${j + 1}.jpg`)]);
  console.log(`combinaison ${combos[i].k} variante ${j + 1} : ${files.length} images`);
}
const shots = (await page.evaluate(() => __hb.SHOTS.map(s => s.k))).filter(k => k !== "kungfu"); // le kung-fu se joue à deux : pas de rafale centrée sur un seul tireur
for (let k = 0; k < shots.length; k++) {
  await page.evaluate(() => document.querySelectorAll('.lb,.tt').forEach(e => e.remove()));
  const who = await page.evaluate((k) => { const hb = __hb, S = hb.S; hb._wing = undefined; hb.hud(false); hb.train('tir', k); let n = 0; while (n++ < 400 && (S.ball.state !== 0 || S.phase !== 'play')) hb.step(1); const id = S.ball.holder; n = 0; while (n++ < 400 && S.P[id].act !== 1) hb.step(1); return id; }, k);
  const files = [];
  for (let f = 0; f < 16; f++) {
    await page.evaluate((who) => { const hb = __hb, p = hb.S.P[who], b = hb.S.ball; if (hb.S.P[who].act === 1 || b.state === 0) { hb._cx = p.x; hb._cz = p.z; } if (hb._wing === undefined) hb._wing = hb._cz < -6; if (hb._wing) hb.setCam(22.6, 2.4, -11.6, 18.2, 1.1, -2.4, 0.78); else hb.setCam(hb._cx - 3.4, 2.3, hb._cz + 4.4, (hb._cx + 20) / 2 + 1, 1.2, hb._cz * 0.45, 0.8); hb.render(); }, who);
    const fn = join(tmp, `s${f}.png`); await page.screenshot({ path: fn }); files.push(fn);
    await page.evaluate(() => __hb.step(5));
  }
  execFileSync('montage', [...files, '-resize', '640x', '-tile', '4x', '-geometry', '+3+3', '-quality', '82', join(out, `tir-${shots[k]}.jpg`)]);
  console.log(`tir ${shots[k]} : ${files.length} images`);
}
rmSync(tmp, { recursive: true, force: true });
if (errors.length) console.log('ERREURS\n' + errors.join('\n'));
await browser.close();
