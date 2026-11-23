// Mesure le geste du dribble en course : angle de l'avant-bras, flexion du coude, position du ballon par rapport au porteur.
import { open } from './lib.mjs';
const { browser, page } = await open(800, 450);
const r = await page.evaluate(() => { const hb = __hb, S = hb.S; hb.init(20261118, 300, true); const A = [], E = [], F = [], Lt = [], H = []; let run = 0;
  for (let n = 0; n < 40000 && A.length < 400; n++) { hb.step(1); const b = S.ball; if (b.state !== 0) { run = 0; continue; } const p = S.P[b.holder], sp = Math.hypot(p.vx, p.vz); if (!(p.drib && sp > 4)) { run = 0; continue; } if (++run < 12) continue;
    const J = p.J, s = (p.lefty ? 3 : 6) * 3, e = (p.lefty ? 4 : 7) * 3, h = (p.lefty ? 5 : 8) * 3, v = (a, c) => [J[c] - J[a], J[c + 1] - J[a + 1], J[c + 2] - J[a + 2]], u = v(e, s), f = v(e, h), d = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2], n2 = x => Math.hypot(...x);
    A.push(Math.atan2(f[1], Math.hypot(f[0], f[2])) * 57.3); E.push(Math.acos(d(u, f) / (n2(u) * n2(f))) * 57.3); H.push(J[h + 1] / p.h);
    F.push(((b.x - p.x) * p.vx + (b.z - p.z) * p.vz) / sp); Lt.push(Math.abs(-(b.x - p.x) * p.vz + (b.z - p.z) * p.vx) / sp); }
  const mm = a => [Math.min(...a).toFixed(2), Math.max(...a).toFixed(2)]; return { echantillons: A.length, avantBrasDeg: mm(A), coudeDeg: mm(E), mainHauteurRelative: mm(H), ballonDevant_m: mm(F), ballonLateral_m: mm(Lt) }; });
console.log(JSON.stringify(r)); await browser.close();
