// Rend les 8 poses fixes du critique visuel. Usage : node poses.mjs <dossier de sortie> [largeur hauteur]
import { open, ROOT } from './lib.mjs';
import { join, isAbsolute } from 'node:path';
import { mkdirSync } from 'node:fs';
const out = isAbsolute(process.argv[2] || '') ? process.argv[2] : join(ROOT, process.argv[2] || 'travail/rendus');
const W = +(process.argv[3] || 1920), H = +(process.argv[4] || 1080);
mkdirSync(out, { recursive: true });
const { browser, page, errors } = await open(W, H);
const shot = async n => { await page.evaluate(() => window.__hb.render()); await page.screenshot({ path: join(out, n + '.png') }); };
const ev = f => page.evaluate(f);
// 1 salle entière
await ev(() => { const hb = __hb; hb.init(11, 300, true); hb.step(60 * 22); hb.hud(false); hb.setCam(-5, 12.5, 26.5, 0, 0.5, -3, 0.95); }); await shot('pose1-salle');
// 2 attaque placée, caméra de retransmission
await ev(() => { const hb = __hb; hb.placed(false); hb.step(75); hb.hud(true); hb.cam(0); }); await shot('pose2-attaque-placee');
// 3 duel au contact
await ev(() => { const hb = __hb, S = hb.S; hb.hud(false); let n = 0; while (n++ < 900) { hb.step(1); const b = S.ball; if (b.state === 0) { const p = S.P[b.holder]; if (p.contact > 0 && p.role !== 0) break; } } const p = S.P[Math.max(0, S.ball.holder)]; hb.setCam(p.x - 3.2, 1.7, p.z + 4.2, p.x + 0.3, 1.25, p.z, 0.6); }); await shot('pose3-duel');
// 4 tireur en suspension
await ev(() => { const hb = __hb, S = hb.S; hb.train('tir', 1); let n = 0; while (n++ < 400) { hb.step(1); const p = S.P[3]; if (p.act === 1 && p.at / p.ad > 0.42) break; } const p = S.P[3]; hb.setCam(p.x - 1.2, 1.9, p.z + 3.4, p.x + 0.2, 1.75 + p.y * 0.6, p.z, 0.62); }); await shot('pose4-suspension');
// 5 gardien en parade
await ev(() => { const hb = __hb, S = hb.S; let n = 0; while (n++ < 200) { hb.step(1); const g = S.P[7]; if (g.act === 4 && g.at >= g.svD - 0.02) break; } const g = S.P[7]; hb.setCam(g.x - 4.6, 1.5, g.z + 1.6, g.x, 1.15, g.z, 0.6); }); await shot('pose5-gardien');
// 6 ballon en main, très gros plan
await ev(() => { const hb = __hb, S = hb.S; hb.placed(false); hb.step(20); const p = S.P[S.ball.holder], b = S.ball; hb.setCam(b.x + 0.5, b.y + 0.35, b.z + 1.25, b.x, b.y + 0.1, b.z, 0.55); }); await shot('pose6-ballon');
// 7 tribune
await ev(() => { const hb = __hb; hb.S.cheer = 0.8; hb.setCam(2, 5.5, 4, -6, 6.2, -20, 0.6); }); await shot('pose7-tribune');
// 8 vue tactique
await ev(() => { const hb = __hb; hb.train('combo', 0, 0); hb.step(95); hb.hud(true); hb.cam(2); }); await shot('pose8-tactique');
if (errors.length) console.log('ERREURS\n' + errors.join('\n')); else console.log('poses écrites dans ' + out);
await browser.close();
