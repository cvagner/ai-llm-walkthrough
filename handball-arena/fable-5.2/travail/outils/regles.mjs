// Tests automatisés : une situation par règle, puis les commandes. Sortie : travail/rapport-regles.md
import { open, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
const { browser, page, errors } = await open(1280, 720);
const res = await page.evaluate(() => {
  const hb = window.__hb, S = hb.S, out = [];
  const reset = () => { const i = S.inp; i.mx = i.mz = 0; i.pass = i.shoot = i.drib = i.feint = i.sw = i.tackle = i.block = false; i.combo = -1; i.shotSel = 0; S.ev.length = 0; };
  const has = c => S.ev.some(e => e.c === c), first = c => S.ev.find(e => e.c === c);
  const T = (name, rule, ok, detail) => out.push({ name, rule, ok: !!ok, detail: detail || '' });
  const run = (n, f) => { for (let k = 0; k < n; k++) { if (f && f(k) === false) break; hb.step(1); } };
  // 1. plus de trois pas
  hb.placed(true); reset(); S.inp.mx = -1; run(240, () => !has('marcher'));
  { const e = first('marcher'), r = first('reprise:jf'); T('Quatrième pas sans dribble', '7.3', e && r && r.team === 1, e ? `sifflé à t=${e.t}s, jet franc pour l'adversaire` : 'non sifflé'); }
  // 2. dribble : pas de faute de pas
  hb.placed(true); reset(); S.inp.mx = -1; S.inp.drib = true; run(150);
  T('Course en dribble', '7.4', !has('marcher') && !has('3-secondes'), 'ni marcher ni 3 secondes en 2,5 s de dribble');
  // 3. reprise de dribble
  S.inp.drib = false; run(8); S.inp.drib = true; run(6);
  T('Reprise de dribble', '7.7', has('reprise-dribble') && first('reprise:jf')?.team === 1, has('reprise-dribble') ? 'sifflée, jet franc adverse' : 'non sifflée');
  // 4. trois secondes
  hb.placed(true); reset(); run(260, () => !has('3-secondes'));
  { const e = first('3-secondes'); T('Ballon gardé plus de 3 secondes', '7.2', e && Math.abs(e.t - S.ev[0]?.t) < 4 && first('reprise:jf')?.team === 1, e ? 'sifflé' : 'non sifflé'); }
  // 5. empiètement de l'attaquant
  hb.placed(true); reset(); { const p = S.P[S.ball.holder]; p.x = 14.3; p.z = 0.2; p.tx = p.x; p.tz = p.z; } run(10);
  T("Attaquant au sol dans la surface de but avec le ballon", '6.2', has('zone') && first('reprise:renvoi')?.team === 1, has('zone') ? 'renvoi pour le gardien adverse' : 'non sifflé');
  // 6. défenseur dirigé dans sa surface de but
  hb.init(3, 300, false); reset(); run(3000, () => !(S.phase === 'play' && S.poss === 1 && S.ball.state === 0 && S.P[S.ball.holder].role !== 0 && hb.zoneDist(20 + S.P[S.ball.holder].x, S.P[S.ball.holder].z) < 12 && S.ctl > 0 && !S.setPiece));
  { const h = S.P[S.ball.holder], d = S.P[S.ctl]; S.ev.length = 0; S.tm[1].st = 1; S.tm[1].combo = null; h.x = -11.6; h.z = 0.5; h.drib = false; d.x = -14.6; d.z = 0.3; run(50, () => { d.x = -14.6; d.z = 0.3; d.vx = d.vz = 0; h.x = -11.6; h.z = 0.5; h.vx = h.vz = 0; h.holdT = 0; h.steps = 0; h.ai.t = -5; return !has('defense-en-zone'); }); }
  T('Défenseur qui défend dans sa surface de but', '8.7f / 14.1', has('defense-en-zone') && first('reprise:7m')?.team === 1, has('defense-en-zone') ? 'jet de 7 m' : 'non sifflé');
  // 7. jet de 7 m : placements au coup de sifflet
  if (!has('reprise:7m')) hb.startRestart('7m', 1, 0, 0);
  run(400, () => !has('sifflet'));
  { const sh = S.P[S.ball.holder] || S.P[10], g = S.P[0], dir = S.dir[1]; let minZ = 99; for (let i = 0; i < 14; i++) { const p = S.P[i]; if (p.off || p === sh || p.role === 0) continue; minZ = Math.min(minZ, hb.zoneDist(hb.uOf(p.x, dir), p.z)); }
    const uS = hb.uOf(sh.x, dir), uG = hb.uOf(g.x, dir); T('Jet de 7 m : placements', '14.3 à 14.9', Math.abs(uS - 7.25) < 0.4 && uG <= 4.05 && minZ >= 8.9, `tireur à ${uS.toFixed(2)} m, gardien à ${uG.toFixed(2)} m, joueur le plus proche du but à ${minZ.toFixed(2)} m`); }
  // 8. jet franc ramené à la ligne des 9 m, défenseurs à 3 m
  hb.placed(false); reset(); hb.freeThrow(0, 15.5, 2.0, 'Essai'); const spot = { x: S.rs.x, z: S.rs.z }; run(400, () => !has('sifflet'));
  { const zs = hb.zoneDist(hb.uOf(spot.x, 1), spot.z); let ok = true, dmin = 99; for (let r = 1; r < 7; r++) { const p = S.P[7 + r], d = Math.hypot(p.x - spot.x, p.z - spot.z), zd = hb.zoneDist(hb.uOf(p.x, 1), p.z); if (zd > 6.9) { dmin = Math.min(dmin, d); if (d < 2.95) ok = false; } }
    T('Jet franc : lieu et distance des défenseurs', '13.6 à 13.8', zs >= 9 && zs < 9.3 && ok, `lieu à ${zs.toFixed(2)} m du but, défenseur avancé le plus proche à ${dmin === 99 ? '—' : dmin.toFixed(2) + ' m'}`); }
  // 9. jeu passif : avertissement puis cinquième passe reçue
  hb.placed(true); reset(); S.pas.t = 25.9; let passes = 0, order = [2, 3, 4, 3];
  run(1500, () => { if (has('jeu-passif') || S.poss !== 0) return false; const h = S.ball.state === 0 ? S.P[S.ball.holder] : null; if (h && h.team === 0 && !h.act && h.holdT > 0.25 && S.pas.warn) { const q = S.P[order[passes % 4] === h.id ? order[(passes + 1) % 4] : order[passes % 4]]; hb.startPass(h, q); passes++; } });
  { const w = has('avertissement-passif'), e = has('jeu-passif'), rec = S.ev.filter(x => x.c === 'reception' && x.t >= (first('avertissement-passif')?.t || 0)).length; T('Jeu passif', '7.11 et 7.12', w && e && rec === 5 && first('reprise:jf')?.team === 1, `avertissement : ${w}, passes reçues après le geste : ${rec}, jet franc adverse : ${e}`); }
  // 10. exclusion de 2 minutes et retour
  hb.init(9, 600, true); reset(); run(300); S.ev.length = 0; const ex = S.P[9]; hb.sanction(ex, 2); const t0 = S.clock; let minField = 9;
  run(60 * 400, () => { let n = 0; for (let r = 1; r < 7; r++) if (!S.P[7 + r].off) n++; if (ex.off) minField = Math.min(minField, n); return !has('retour') || first('retour').a !== 9; });
  { const dur = S.clock - t0; T('Exclusion de 2 minutes', '16.3 et 16.5', minField <= 5 && Math.abs(dur - 120) < 1, `équipe réduite (${minField} joueurs de champ au plus bas) pendant ${dur.toFixed(1)} s de jeu`); }
  // 11. engagement après but
  hb.init(20261118, 600, true); reset(); run(60 * 300, () => !has('but'));
  { const g = first('but'); S.ev.length = 0; run(600, () => !has('sifflet')); const sf = first('sifflet'), e = S.P[S.ball.holder] || S.P[3], t = 1 - g.team, dir = S.dir[t]; let own = true; for (let r = 0; r < 7; r++) { const p = S.P[t * 7 + r]; if (!p.off && dir * p.x > 0.4) own = false; }
    T('Engagement après but', '10.1 à 10.3', sf && sf.a === 'eng' && sf.team === t && Math.hypot(e.x, e.z) < 0.6 && own, `engagement par l'équipe qui a encaissé, exécutant à ${Math.hypot(e.x, e.z).toFixed(2)} m du centre, équipe dans son camp : ${own}`); }
  // 12. sortie en touche
  hb.placed(false); reset(); { const b = S.ball, h = S.P[b.holder]; b.state = 2; b.holder = -1; b.kind = 0; b.x = 5; b.y = 1; b.z = 9.5; b.vx = 0; b.vy = 1; b.vz = 9; b.lastTeam = 0; b.lastP = h.id; } run(30);
  T('Ballon sorti en touche', '11.1', first('reprise:touche')?.team === 1, 'remise en jeu pour l\'adversaire du dernier joueur à avoir touché le ballon');
  // 13. but valable et montant
  hb.placed(false); reset(); { const b = S.ball; b.state = 1; b.holder = -1; b.kind = 0; b.x = 19; b.y = 1.9; b.z = 1.2; b.vx = 20; b.vy = 0; b.vz = 0; b.lastTeam = 0; } const s0 = S.score[0]; run(10);
  T('But : ballon entièrement dans le but', '9.1', has('but') && S.score[0] === s0 + 1, 'but accordé');
  hb.placed(false); reset(); { const b = S.ball; b.state = 1; b.holder = -1; b.kind = 0; b.x = 19; b.y = 1.0; b.z = 1.55; b.vx = 20; b.vy = 0; b.vz = 0; b.lastTeam = 0; } run(6);
  T('Montant', '1.2', has('poteau') && !has('but'), 'le ballon rebondit sur le montant');
  // 15. temps mort d'équipe
  hb.init(4, 300, true); reset(); run(3000, () => !(S.phase === 'play' && S.poss === 0 && S.ball.state === 0 && !S.setPiece)); S.ev.length = 0;
  { const ok1 = hb.requestTimeout(0), bad = hb.requestTimeout(1); run(700, () => !has('sifflet')); const sf = first('sifflet'); hb.requestTimeout(0); run(30); run(700, () => S.phase !== 'play'); run(700, () => !(S.phase === 'play' && S.poss === 0 && S.ball.state === 0 && !S.setPiece)); const third = hb.requestTimeout(0);
    T("Temps mort d'équipe", '2.10', ok1 && !bad && has('temps-mort') && sf && sf.team === 0 && sf.a === 'jf' && !third && S.tmoHalf[0] === 2, `accordé à l'équipe en possession : ${ok1}, refusé à l'adversaire : ${!bad}, reprise par jet franc : ${!!sf && sf.a === 'jf'}, troisième de la mi-temps refusé : ${!third}`); }
  // 16. ralenti rejoué : l'enregistrement ne modifie pas la simulation
  hb.init(20261118, 300, true); reset(); run(60 * 300, () => !has('but')); run(70);
  { const sig = () => { let h = 0; for (const p of S.P) { h += p.x * 3.1 + p.z * 1.7 + p.y; for (let k = 0; k < p.J.length; k += 7) h += p.J[k]; } return h + S.ball.x + S.ball.y; }; const before = sig(), n = hb.REC.count, ok = hb.replayStart(); let frames = 0; if (ok) { while (!hb.replayFrame(1 / 60) && frames < 2000) frames++; hb.replayEnd(); }
    T('Ralenti rejoué après un but', 'cahier des charges', ok && frames > 200 && Math.abs(sig() - before) < 1e-6, `enregistrement de ${n} images, ralenti de ${frames} images, état de la simulation identique après le ralenti : ${Math.abs(sig() - before) < 1e-6}`); }
  // 17. gabarits par poste
  hb.init(1, 300, true); reset();
  { const H = p => p.h * 1.88, W = [1, 5, 8, 12].map(i => H(S.P[i])), B = [2, 3, 4, 9, 10, 11].map(i => H(S.P[i])), PV = [6, 13].map(i => S.P[i]);
    const ok = W.every(h => h >= 1.695 && h <= 1.855) && B.every(h => h >= 1.845 && h <= 1.955) && PV.every(p => H(p) >= 1.845 && H(p) <= 1.955 && p.build > S.P[2].build + 0.12) && S.P[1].acc > S.P[2].acc && S.P[2].acc > S.P[6].acc;
    T('Gabarits par poste', 'demande', ok, `ailiers ${Math.min(...W).toFixed(2)}-${Math.max(...W).toFixed(2)} m, arrières et demi-centres ${Math.min(...B).toFixed(2)}-${Math.max(...B).toFixed(2)} m, pivots ${PV.map(p => H(p).toFixed(2)).join(' et ')} m (carrure ${PV[0].build.toFixed(2)} contre ${S.P[2].build.toFixed(2)})`); }
  // 18. jeu placé : passes de voisin à voisin, temps faible puis temps fort
  hb.init(39, 300, true); reset(); run(60 * 620, () => S.phase !== 'end');
  { const n = c => S.ev.filter(e => e.c === c).length; T('Jeu placé sans longue passe, avec temps forts', 'demande', n('passe-longue') === 0 && n('temps-fort') >= 10 && n('passe') > 150, `${n('passe')} passes, ${n('passe-longue')} par-dessus un voisin en jeu placé, ${n('temps-fort')} temps forts déclenchés`); }
  // ---------- commandes
  const C = (name, ok, detail) => out.push({ name, rule: 'commande', ok: !!ok, detail: detail || '' });
  const press = code => window.dispatchEvent(new KeyboardEvent('keydown', { code })), rel = code => window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  const tick = n => { for (let k = 0; k < n; k++) { hb.pollInput(1 / 60); hb.step(1); } };
  hb.cam(0); hb.placed(true); reset(); let p = S.P[S.ball.holder], x0 = p.x, z0 = p.z;
  press('KeyA'); tick(20); rel('KeyA'); C('Se déplacer (Q / gauche)', p.x < x0 - 0.3, `x ${x0.toFixed(2)} → ${p.x.toFixed(2)}`);
  hb.placed(true); reset(); p = S.P[S.ball.holder]; z0 = p.z; press('KeyW'); tick(20); rel('KeyW'); C('Se déplacer (Z / haut)', p.z < z0 - 0.3, `z ${z0.toFixed(2)} → ${p.z.toFixed(2)}`);
  hb.placed(true); reset(); press('Space'); tick(30); rel('Space'); C('Passer (Espace)', has('passe'), 'passe déclenchée');
  hb.placed(true); reset(); press('ShiftLeft'); tick(12); C('Dribbler (Maj)', S.P[S.ball.holder] && S.P[S.ball.holder].drib, 'dribble en cours'); rel('ShiftLeft'); tick(3);
  hb.placed(true); reset(); press('KeyJ'); tick(25); const ch = S.charge; rel('KeyJ'); tick(50); C('Armer et tirer (J)', ch > 0.3 && S.ev.some(e => e.c.startsWith('tir:')), `force ${ch.toFixed(2)}, tir déclenché`);
  hb.placed(true); reset(); press('Digit7'); tick(2); rel('Digit7'); press('KeyJ'); tick(20); rel('KeyJ'); tick(5); C('Choisir le geste (7 : lob)', has('tir:lob'), 'le tir déclenché est un lob'); press('Digit0'); tick(1); rel('Digit0');
  hb.placed(true); reset(); press('KeyE'); tick(3); rel('KeyE'); C("Annoncer l'espagnole (E)", has('combinaison:espagnole'), ''); 
  hb.placed(true); reset(); press('KeyY'); tick(3); rel('KeyY'); C('Annoncer yago (Y)', has('combinaison:yago'), '');
  hb.placed(true); reset(); S.P[1].x = 17.8; S.P[1].z = -9; press('KeyG'); tick(70); rel('KeyG'); C('Kung-fu (G)', has('passe-kung-fu') && has('tir:kungfu'), has('tir:kungfu') ? 'passe en l\'air, réception et tir avant de retomber' : 'pas de tir');
  hb.placed(true); reset(); press('KeyD'); press('KeyH'); tick(4); rel('KeyH'); rel('KeyD'); C('Feinte (H)', has('feinte'), '');
  hb.init(3, 300, false); reset(); run(3000, () => !(S.phase === 'play' && S.poss === 1 && S.ctl > 0)); const c0 = S.ctl; press('KeyF'); tick(3); rel('KeyF'); C('Changer de défenseur (F)', S.ctl !== c0 && S.ctl > 0, `joueur ${c0} → ${S.ctl}`);
  { const d = S.P[S.ctl]; press('Space'); tick(8); rel('Space'); C('Contrer (Espace)', d.act === 3 && d.y > 0, 'saut bras levés'); }
  { const d0 = S.defSys[0]; press('KeyV'); tick(1); rel('KeyV'); C('Changer de système défensif (V)', S.defSys[0] !== d0, ''); S.defSys[0] = 0; }
  { const c1 = hb.UI.cam; press('KeyC'); tick(1); rel('KeyC'); C('Changer de caméra (C)', hb.UI.cam !== c1, ''); hb.UI.cam = 0; }
  return out;
});
let md = '# Tests de règles et de commandes\n\n| Test | Règle | Résultat | Détail |\n|---|---|---|---|\n';
for (const r of res) md += `| ${r.name} | ${r.rule} | ${r.ok ? 'réussi' : '**ÉCHEC**'} | ${r.detail} |\n`;
const ko = res.filter(r => !r.ok).length; md += `\n${res.length - ko} réussis sur ${res.length}.\n`;
writeFileSync(join(ROOT, 'travail', 'rapport-regles.md'), md);
for (const r of res) console.log((r.ok ? 'ok   ' : 'ÉCHEC') + ' ' + r.name + ' — ' + r.detail);
if (errors.length) console.log('ERREURS\n' + errors.join('\n'));
await browser.close();
