// Rafales rapprochées pour le critique de la démarche : un joueur suivi de profil dans cinq situations de déplacement.
// Usage : node demarche.mjs <dossier>
import { open, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = join(ROOT, process.argv[2] || 'travail/demarche'); mkdirSync(out, { recursive: true });
const tmp = join(out, '_tmp'); mkdirSync(tmp, { recursive: true });
const { browser, page, errors } = await open(1280, 720);
// Chaque situation : un prédicat sur un joueur de champ, qui doit tenir 12 pas de suite.
const SIT = [
  ['course-repli', 'p.role !== 0 && S.phase === "dead" && S.rs.type === "eng" && sp > 3 && vf > 2.5'],
  ['marche', 'p.role !== 0 && sp > 0.9 && sp < 1.75 && vf > 0.7 && p.stance < 0.5 && !hold'],
  ['recul-face-au-porteur', 'p.role !== 0 && p.team !== S.poss && sp > 1.6 && vf < -1.2'],
  ['pas-chasses', 'p.role !== 0 && p.team !== S.poss && p.stance > 0.5 && sp > 1.3 && Math.abs(vr) > 1.1 && Math.abs(vf) < 0.9'],
  ['course-avec-ballon', 'hold && p.drib && sp > 4'],
];
for (const [name, pred] of SIT) {
  const who = await page.evaluate((pred) => { const hb = __hb, S = hb.S; hb.init(20261118, 300, true); hb.hud(false); const run = new Array(14).fill(0); const NEED = /marche|repli/.test(pred) || pred.includes('sp < 1.75') || pred.includes('"eng"') ? 36 : 14; const f = new Function('p', 'S', 'sp', 'vf', 'vr', 'hold', 'return ' + pred);
    for (let n = 0; n < 30000 && S.phase !== 'end'; n++) { hb.step(1); for (let i = 0; i < 14; i++) { const p = S.P[i]; if (p.off) { run[i] = 0; continue; } const fx = Math.cos(p.yaw), fz = Math.sin(p.yaw), sp = Math.hypot(p.vx, p.vz), vf = p.vx * fx + p.vz * fz, vr = -p.vx * fz + p.vz * fx; run[i] = f(p, S, sp, vf, vr, S.ball.state === 0 && S.ball.holder === i) && p.y < 0.02 ? run[i] + 1 : 0; if (run[i] >= NEED) return i; } } return -1; }, pred);
  if (who < 0) { console.log(name + ' : situation non trouvée'); continue; }
  const files = [];
  for (let f = 0; f < 16; f++) {
    await page.evaluate(([who, NAME]) => { const hb = __hb, p = hb.S.P[who], v = Math.hypot(p.vx, p.vz); if (hb._dk !== NAME) { hb._dk = NAME; hb._dx = v > 0.3 ? p.vx / v : Math.cos(p.yaw); hb._dz = v > 0.3 ? p.vz / v : Math.sin(p.yaw); } const fx = hb._dx, fz = hb._dz; /* caméra fixe, perpendiculaire au déplacement initial */ let sx = -fz, sz = fx; if (sz < 0) { sx = -sx; sz = -sz; } if (NAME === 'course-avec-ballon') { const k = p.lefty ? -1 : 1; sx = -fz * k; sz = fx * k; } /* dribble : caméra du côté de la main qui dribble */ // caméra de profil, du côté du grand public
      const hi = NAME === 'course-avec-ballon' || NAME === 'pas-chasses'; hb.setCam(p.x + sx * (hi ? 3.6 : 5.2) + fx * 0.6, hi ? 3.4 : 1.5, p.z + sz * (hi ? 3.6 : 5.2) + fz * 0.6, p.x, 0.9, p.z, hi ? 0.6 : 0.46); /* caméra surélevée : moins de joueurs devant */ hb.render(); hb.step(4); }, [who, name]);
    const fn = join(tmp, `d${f}.png`); await page.screenshot({ path: fn }); files.push(fn);
  }
  execFileSync('montage', [...files, '-resize', '640x', '-tile', '4x', '-geometry', '+3+3', '-quality', '84', join(out, `demarche-${name}.jpg`)]);
  console.log(name + ' : joueur ' + who);
}
rmSync(tmp, { recursive: true, force: true });
if (errors.length) console.log('ERREURS\n' + errors.join('\n'));
await browser.close();
