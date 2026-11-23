// Trace une combinaison à l'entraînement : étape, porteur, distance au but, défenseur le plus proche. Usage : node trace-combo.mjs <combinaison> <variante>
import { open } from './lib.mjs';
const [ci, vi] = [+(process.argv[2] || 0), +(process.argv[3] || 0)];
const { browser, page } = await open(800, 450);
const r = await page.evaluate(([ci, vi]) => { const hb = __hb, S = hb.S, R = ['GB', 'ALG', 'ARG', 'DC', 'ARD', 'ALD', 'PVT'], out = []; hb.train('combo', ci, vi);
  for (let k = 0; k < 330; k++) { hb.step(1); if (k % 15) continue; const tm = S.tm[0], b = S.ball, h = b.state === 0 ? S.P[b.holder] : null; let nd = 9; if (h) for (let r = 8; r < 14; r++) nd = Math.min(nd, Math.hypot(S.P[r].x - h.x, S.P[r].z - h.z));
    out.push(`t=${(k / 60).toFixed(2)} combo=${tm.combo ? tm.combo.k : '-'} etape=${tm.step} tE=${tm.stepT.toFixed(2)} tempo=${tm.tempo} porteur=${h ? R[h.role] + (h.team ? '(déf)' : '') : '-'} u=${h ? (20 - h.x).toFixed(1) : ''} nd=${h ? nd.toFixed(2) : ''} pas=${h ? h.steps : ''} act=${h ? h.act : ''} tenu=${h ? h.holdT.toFixed(2) : ''} phase=${S.phase}`); }
  return out.join('\n') + '\n' + S.ev.map(e => e.c + '@' + e.t).join(' '); }, [ci, vi]);
console.log(r); await browser.close();
