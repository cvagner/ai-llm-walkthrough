// Vérifie le son : pas d'erreur, signal émis, décompte des sons déclenchés sur un match IA de 2 × 5 min.
import { open } from './lib.mjs';
const { browser, page, errors } = await open(800, 450, '?test&son');
await page.mouse.click(400, 225);
const r = await page.evaluate(async () => {
  const hb = __hb, S = hb.S, SND = hb.SND, sndFrame = hb.sndFrame, UI = hb.UI, c = SND.ctx; if (!c) return { erreur: 'pas de contexte audio' };
  const an = c.createAnalyser(); an.fftSize = 2048; SND.out.connect(an); const buf = new Float32Array(2048);
  const rms = () => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; return +Math.sqrt(s / buf.length).toFixed(4); };
  hb.init(21, 300, true); UI.paused = false;
  const niveaux = {}; let n = 0, tBut = -1;
  /* une minute en temps réel pour mesurer le niveau du public, calme puis après un but */
  const t0 = performance.now(); let calme = 0, nc = 0, but = 0;
  while (performance.now() - t0 < 25000) {
    for (let i = 0; i < 4; i++) { hb.step(1); sndFrame(1 / 60); }
    await new Promise(r => setTimeout(r, 16)); n++;
    if (SND.n.but && tBut < 0) tBut = performance.now();
    if (tBut < 0) { if (n > 30) { calme += rms(); nc++; } } else if (performance.now() - tBut < 1500) but = Math.max(but, rms());
  }
  niveaux.public_calme = +(calme / Math.max(1, nc)).toFixed(4); niveaux.pic_apres_but = but;
  let k = 0; while (S.phase !== 'end' && k++ < 80000) { hb.step(1); sndFrame(1 / 60); }
  return { etat: c.state, niveaux, voix_fr: !!(window.speechSynthesis && speechSynthesis.getVoices().find(v => /^fr/i.test(v.lang))), sons: SND.n, score: S.score };
});
console.log(JSON.stringify(r, null, 1), errors.join(' | '));
await browser.close();
