// Planche d'un temps fort en vue du dessus (postes étiquetés). Usage : node temps-fort.mjs <dossier>
import { open, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = join(ROOT, process.argv[2] || 'travail/rendus/tempo'); mkdirSync(out, { recursive: true }); const tmp = join(out, '_tmp'); mkdirSync(tmp, { recursive: true });
const { browser, page, errors } = await open(1280, 720);
await page.addStyleTag({ content: '.lb{position:fixed;font:700 13px system-ui;padding:1px 5px;border-radius:4px;transform:translate(-50%,-150%);z-index:9;white-space:nowrap}.a{background:#fff;color:#033}.d{background:#b01020;color:#fff}.tt{position:fixed;left:10px;top:8px;font:700 20px system-ui;color:#fff;background:rgba(0,0,0,.7);padding:3px 10px;border-radius:5px;z-index:9}' });
await page.evaluate(() => { const hb = __hb, S = hb.S; hb.placed(false); hb.hud(false); let n = 0; while (n++ < 3000 && !(S.tm[0].tempo === 1)) hb.step(1); for (let k = 0; k < 3; k++) hb.step(1); hb.setCam(10.5, 14.4, 3.0, 10.5, 0, 0.3, 1.2); });
const files = [];
for (let f = 0; f < 12; f++) {
  await page.evaluate((f) => { document.querySelectorAll('.lb,.tt').forEach(e => e.remove()); const hb = __hb, S = hb.S, R = ['GB', 'ALG', 'ARG', 'DC', 'ARD', 'ALD', 'PVT']; hb.render();
    for (let i = 0; i < 14; i++) { const p = S.P[i]; if (p.off) continue; const [x, y] = hb.project(p.x, 0, p.z), d = document.createElement('div'); d.className = 'lb ' + (p.team ? 'd' : 'a'); d.textContent = (p.team ? 'déf ' : '') + R[p.role] + (S.ball.state === 0 && S.ball.holder === i ? ' ●' : ''); d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); }
    const t = document.createElement('div'); t.className = 'tt'; t.textContent = `t = ${(f * 0.3).toFixed(1)} s — ${S.tm[0].tempo ? 'temps fort' : 'temps faible'}`; document.body.appendChild(t); }, f);
  const fn = join(tmp, `t${f}.png`); await page.screenshot({ path: fn }); files.push(fn); await page.evaluate(() => __hb.step(18));
}
execFileSync('montage', [...files, '-resize', '640x', '-tile', '4x', '-geometry', '+3+3', '-quality', '84', join(out, 'temps-fort.jpg')]);
rmSync(tmp, { recursive: true, force: true }); if (errors.length) console.log(errors.join('\n')); await browser.close();
