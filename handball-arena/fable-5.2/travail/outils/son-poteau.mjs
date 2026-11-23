// Page réelle (boucle d'images) : envoie un tir sur le poteau et mesure la crête du son avant et après.
import { open } from './lib.mjs';
const { browser, page, errors } = await open(1280, 720, '');
await page.click('#panel button:has-text("exhibition")'); await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const hb = __hb, S = hb.S, SND = hb.SND, c = SND.ctx, an = c.createAnalyser(); an.fftSize = 2048; SND.comp.connect(an); /* mesure après le compresseur de sortie */ const buf = new Float32Array(2048);
  const pk = async ms => { let m = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(buf); for (const v of buf) m = Math.max(m, Math.abs(v)); await new Promise(r => setTimeout(r, 8)); } return +m.toFixed(3); };
  const avant = await pk(1500), n0 = SND.n.poteau || 0, b = S.ball, cles = Object.keys(b).join(',');
  let essais = 0, apres = 0;
  while ((SND.n.poteau || 0) === n0 && essais++ < 6) { b.state = 1; b.kind = 2; b.holder = -1; b.curve = false; b.x = 18.6; b.y = 1.1; b.z = 1.54; b.vx = 22; b.vy = 1.5; b.vz = 0; b.lastTeam = 0; b.shooter = 4; b.lastP = 4; b.shotType = 1; b.target = -1; b.fly = 0; b.hitCd = 0; apres = Math.max(apres, await pk(700)); }
  return { avant, apres, essais, poteaux: (SND.n.poteau || 0) - n0, msg: S.msg, phase: S.phase };
});
console.log(JSON.stringify(r), errors.length ? errors.length + ' erreurs : ' + errors[0] : 'aucune erreur');
await browser.close();
