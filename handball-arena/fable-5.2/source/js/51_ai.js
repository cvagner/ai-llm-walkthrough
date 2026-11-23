// Intelligence de jeu : attaque placée, montée de balle, combinaisons, défenses 0-6 / 1-5 / 3-2-1, gardien, arbitres, joueur dirigé.
const CHAIN = [ALG, ARG, DC, ARD, ALD];
const DEF_C = [-1, -1], DEF_LAG = [0, 0], _mv2 = [0, 0];
const R_OUT = [ALG, ALD, ARG, ARD, DC], R_WING = [ALG, ALD], R_KF = [ALG, ALD, PVT];
const chainIdx = r => r === ALG ? 0 : r === ARG ? 1 : r === DC ? 2 : r === ARD ? 3 : r === ALD ? 4 : 2;
let _no = null;
function nearOpp(p) { let bd = 1e9; _no = null; const o = (1 - p.team) * 7; for (let r = 1; r < 7; r++) { const q = S.P[o + r]; if (q.off) continue; const d = hyp(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; _no = q; } } return bd; }
function laneClear(p, q, m) {
  const dx = q.x - p.x, dz = q.z - p.z, l2 = dx * dx + dz * dz || 1, o = (1 - p.team) * 7;
  for (let r = 1; r < 7; r++) { const e = S.P[o + r]; if (e.off) continue; const t = clamp(((e.x - p.x) * dx + (e.z - p.z) * dz) / l2, 0.12, 0.92); if (hyp(e.x - p.x - dx * t, e.z - p.z - dz * t) < m) return false; }
  return true;
}
function stopDrib(p) { if (p.drib) { p.drib = false; p.dribbled = true; p.steps = 0; p.holdT = 0; p.zeroStep = false; } }
function mate(t, r) { const p = S.P[t * 7 + r]; return p.off ? null : p; }
function startKungfu(p, q) { if (q && q.y <= 0.02 && startPass(p, q)) { p.kf = true; return true; } return false; }

function chooseShot(p) {
  const t = p.team, dir = S.dir[t], g = S.P[(1 - t) * 7], u = uOf(p.x, dir), w = dir * p.z, zd = zoneDist(u, w), nd = nearOpp(p), gOff = HALF_L - abs(g.x), r = rnd();
  if (p.role === PVT && zd < 7.6) return SH_PLONG;
  if ((p.role === ALG || p.role === ALD) && abs(w) > 5 && u < 6) return r < 0.2 ? SH_ROUC : SH_AILIER;
  if ((gOff > 2.2 && zd < 8.6 || gOff > 4.8 && zd < 13) && r < 0.6) return SH_LOB; // de loin, seulement si le gardien est très avancé
  if (zd < 7.4 && nd > 1.5 && r < 0.3) return SH_CHABALA;
  if (hyp(p.vx, p.vz) < 1.2) return r < 0.3 ? SH_HANCHE : SH_APPUI;
  if (nd < 1.7) return r < 0.35 ? SH_DESAXE : r < 0.55 ? SH_HANCHE : SH_SUSP;
  return SH_SUSP;
}
function chooseAim(p, type) {
  const g = S.P[(1 - p.team) * 7]; let by = 1, bz = 0, bs = -1;
  for (let i = 0; i < 4; i++) { const z = i & 1 ? 1.2 : -1.2, y = i & 2 ? 1.68 : 0.24, s = abs(z - g.z) + (y < 1 ? 0.2 : 0) + rnd() * 0.7 + (type === SH_HANCHE && y < 1 ? 0.5 : 0); if (s > bs) { bs = s; by = y; bz = z; } }
  if (type === SH_LOB) { by = 1.7; bz = -g.z * 0.4; }
  else if (type === SH_CHABALA) { by = 1.5; bz = clamp(g.z + (rnd() < 0.5 ? -0.5 : 0.5), -1.1, 1.1); }
  else if (type === SH_ROUC) { by = 0.5; bz = (p.z < 0 ? 1 : -1) * 1.05; }
  _aim[1] = by; _aim[2] = bz;
}
function aiShoot(p, type) { S.tm[p.team].tempo = 0; if (type < 0) type = chooseShot(p); chooseAim(p, type); stopDrib(p); startShot(p, type, _aim[1], _aim[2], 0.9); const tm = S.tm[p.team]; tm.combo = null; tm.step = -1; }

function passToward(p, t, role) {
  const i = chainIdx(p.role), j = chainIdx(role), k = i + (j > i ? 1 : -1), q = mate(t, CHAIN[clamp(k, 0, 4)]) || mate(t, role);
  if (q && q !== p) return startPass(p, q); return false;
}
function passBest(p, tm, t, setPiece) {
  const dir = S.dir[t], pv = mate(t, PVT), zd = zoneDist(uOf(p.x, dir), dir * p.z);
  if (pv && pv !== p && !setPiece && zd < 11 && rnd() < 0.3 && laneClear(p, pv, 0.75)) { nearOpp(pv); if (startPass(p, pv)) return; }
  let i = chainIdx(p.role);
  for (let n = 0; n < 2; n++) {
    let k = i + tm.circ; if (k < 0 || k > 4) { tm.circ = -tm.circ; k = i + tm.circ; }
    const q = mate(t, CHAIN[k]);
    if (q && q !== p && (laneClear(p, q, 0.7) || n === 1)) { startPass(p, q); return; }
    tm.circ = -tm.circ;
  }
  const q = mate(t, DC) || mate(t, ARG) || mate(t, ARD); if (q && q !== p) startPass(p, q);
}
/* Intervalle libre suivant : milieu de l'écart entre deux défenseurs voisins, dans le sens de la circulation. */
const _gp = new Float32Array(8);
function nextGap(p, t, circ) {
  const dir = S.dir[t], o = (1 - t) * 7, th = arcT(uOf(p.x, dir), dir * p.z, 7.5); let n = 0; _gp[n++] = -1;
  for (let r = 1; r < 7; r++) { const e = S.P[o + r]; if (e.off) continue; const eu = uOf(e.x, dir), ew = dir * e.z; if (zoneDist(eu, ew) > 10.5) continue; _gp[n++] = arcT(eu, ew, 7.5); }
  _gp[n++] = 1; for (let i = 1; i < n; i++) { const v = _gp[i]; let j = i - 1; while (j >= 0 && _gp[j] > v) { _gp[j + 1] = _gp[j]; j--; } _gp[j + 1] = v; }
  let best = th + circ * 0.1, bs = 9; for (let i = 0; i < n - 1; i++) { const w = _gp[i + 1] - _gp[i]; if (w < 0.07) continue; const c = (_gp[i] + _gp[i + 1]) / 2, d = (c - th) * circ; if (d > -0.04 && d < bs) { bs = d; best = c; } }
  return clamp(best, -0.92, 0.92);
}
/* Intervalle le plus proche d'une position donnée sur l'arc : le tireur d'une combinaison s'y engage au lieu de buter sur un défenseur. */
function gapNear(t, tt0) {
  const dir = S.dir[t], o = (1 - t) * 7; let n = 0; _gp[n++] = -1;
  for (let r = 1; r < 7; r++) { const e = S.P[o + r]; if (e.off) continue; const eu = uOf(e.x, dir), ew = dir * e.z; if (zoneDist(eu, ew) > 10.5) continue; _gp[n++] = arcT(eu, ew, 7.5); }
  _gp[n++] = 1; for (let i = 1; i < n; i++) { const v = _gp[i]; let j = i - 1; while (j >= 0 && _gp[j] > v) { _gp[j + 1] = _gp[j]; j--; } _gp[j + 1] = v; }
  let best = tt0, bs = 9; for (let i = 0; i < n - 1; i++) { const w = _gp[i + 1] - _gp[i]; if (w < 0.09) continue; const c = (_gp[i] + _gp[i + 1]) / 2, d = abs(c - tt0) - w * 0.5; if (d < bs) { bs = d; best = c; } }
  return clamp(best, -0.9, 0.9);
}
/* Passe au voisin dans le sens de la circulation, jamais par-dessus lui ; au bout, ça revient. */
function passNeighbour(p, tm, t, pivotChance) {
  const dir = S.dir[t], pv = mate(t, PVT);
  if (pv && pv !== p && pivotChance > 0 && rnd() < pivotChance && zoneDist(uOf(p.x, dir), dir * p.z) < 10.5 && laneClear(p, pv, 0.75) && startPass(p, pv)) return true;
  const i = chainIdx(p.role);
  for (let n = 0; n < 2; n++) { let k = i + tm.circ; if (k < 0 || k > 4) { tm.circ = -tm.circ; k = i + tm.circ; } const q = mate(t, CHAIN[k]); if (q && q !== p && startPass(p, q)) return true; tm.circ = -tm.circ; }
  passBest(p, tm, t, false); return true;
}
function startCombo(t, ci, vi) {
  const tm = S.tm[t], c = COMBOS[ci]; tm.combo = c; tm.ci = ci; tm.vi = vi >= 0 ? vi : Math.floor(rnd() * c.variants.length); tm.step = -1; tm.stepT = 0; tm.st = PLACED;
  if (t === 0) { S.comboMsg = 'Combinaison : ' + c.n + ' — ' + c.variants[tm.vi].n; S.comboN++; } evt('combinaison:' + c.k, t, tm.vi);
}
function comboUpdate(t, tm, h) {
  const steps = tm.combo.variants[tm.vi].steps;
  if (tm.step < 0) { if (h && h.team === t && h.role === tm.combo.start) { tm.step = 0; tm.stepT = 0; } tm.next = -1; return; }
  tm.stepT += DT; const st = steps[tm.step];
  if (h && h.team === t && h.role !== st.by) { const nx = steps[tm.step + 1]; if (nx && h.role === nx.by) { tm.step++; tm.stepT = 0; } else { tm.combo = null; tm.step = -1; return; } }
  tm.next = steps[tm.step].to === undefined ? -1 : steps[tm.step].to;
  if (tm.stepT > 5) { tm.combo = null; tm.step = -1; }
}

function aiHolder(p, tm, t) {
  const dir = S.dir[t], u = uOf(p.x, dir), w = dir * p.z, zd = zoneDist(u, w), a = p.ai; a.t += DT;
  p.stance = 0; p.faceOn = true; p.face = Math.atan2(-p.z * 0.6, dir * HALF_L - p.x); p.tx = p.x; p.tz = p.z; p.tsp = 0;
  if (p.act) return;
  if (S.setPiece) { if (a.t < 0.9) return; if (S.rs.type === '7m') { aiShoot(p, SH_7M); return; } passBest(p, tm, t, true); return; }
  if (S.train && S.train.kind === 'tir') { const k = SHOTS[S.train.shot].k; if (k === 'kungfu') { if (a.t > 0.6) startKungfu(p, mate(t, ALG)); return; } const close = k === 'chabala' || k === 'lob' || k === 'roucoulette' || k === 'ailier'; if (a.t > 0.25 && (p.steps < 3 || p.drib)) { p.tx = dir * (HALF_L - 2); p.tz = p.z * 0.6; p.tsp = 6; if (k === 'ailier' || k === 'roucoulette') { p.tx = dir * (HALF_L - 3.1); p.tz = dir * (w < 0 ? -7.3 : 7.3); } if (close && !p.drib && !p.dribbled && k !== 'ailier' && k !== 'roucoulette') { p.drib = true; p.holdT = 0; } } if (k === 'plongeant') { p.tx = p.x; p.tz = p.z; p.tsp = 0; p.face = Math.atan2(-p.z, dir * HALF_L - p.x); } if (close ? (zd < (k === 'ailier' || k === 'roucoulette' ? 6.72 : 6.75) || a.t > 2.4) : a.t > (k === 'suspension' || k === 'desaxe' ? 0.95 : k === 'plongeant' ? 0.4 : 0.62)) aiShoot(p, S.train.shot); return; }
  if (p.role === GB) {
    if (a.t < 0.6) return; let best = null, bs = -1;
    for (const r of R_OUT) { const q = mate(t, r); if (!q) continue; const nd = nearOpp(q), ahead = uOf(p.x, dir) - uOf(q.x, dir); const s = (r === ALG || r === ALD) ? (nd > 5 && ahead > 14 ? 50 : -1) : nd + (r === DC ? 0.5 : 0); if (s > bs && laneClear(p, q, 1)) { bs = s; best = q; } }
    if (best) startPass(p, best); else if (a.t > 2) { const q = mate(t, DC) || mate(t, ARG); if (q) startPass(p, q); } return;
  }
  const nd = nearOpp(p), warn = S.pas.warn;
  if (tm.st === TRANS) {
    if (zd < 7.4 && nd > 1.2) { aiShoot(p, -1); return; }
    if (zd > 12.6 || (nd > 3 && zd > 7.2)) {
      for (const r of R_WING) { const q = mate(t, r); if (q && q !== p && a.t > 0.3 && uOf(q.x, dir) < u - 6 && nearOpp(q) > 4 && laneClear(p, q, 1.2)) { stopDrib(p); startPass(p, q); return; } }
      if (!p.drib) { if (p.dribbled || S.setPiece) { tm.st = PLACED; return; } p.drib = true; p.holdT = 0; }
      p.tx = dir * (HALF_L - max(6.6, u - 4)); p.tz = p.z * 0.82; p.tsp = p.vmax; p.faceOn = false; return;
    }
    stopDrib(p); tm.st = PLACED; a.t = 0; a.mode = 0;
  }
  if (tm.combo) {
    if (tm.step < 0) { if (a.t > 0.35) passToward(p, t, tm.combo.start); return; }
    const st = tm.combo.variants[tm.vi].steps[tm.step]; if (p.role !== st.by) return; const nd0 = nearOpp(p);
    let mv = st.mv[p.role]; if (mv && st.sh === SH_SUSP) { const ap = arcPoint(gapNear(t, arcT(mv[0], mv[1], 7.5)), min(mv[0], 7.6)); _mv2[0] = ap[0]; _mv2[1] = ap[1]; mv = _mv2; } /* tir final : dans l'intervalle ouvert le plus proche de l'écran */
    if (mv && hyp(dir * (HALF_L - mv[0]) - p.x, dir * mv[1] - p.z) > 0.5) { if (p.steps >= 2 && !p.drib && !p.dribbled) { p.drib = true; p.holdT = 0; } if (p.steps < 3 || p.drib) { p.tx = dir * (HALF_L - mv[0]); p.tz = dir * mv[1]; p.tsp = 6.2; } } else if (p.drib) stopDrib(p);
    const hot = !st.hold && (st.sh === undefined ? nd0 < 1.35 && tm.stepT > st.t * 0.6 : nd0 < 2.0 && zd < 9.6 && tm.stepT > st.t * 0.4); /* le défenseur arrive : passer dans le temps, ou tirer en suspension avant le contact */ // le défenseur arrive : jouer dans le temps plutôt que d'être neutralisé
    if (tm.stepT >= st.t && st.sh === SH_SUSP && zd > 8.3 && nd0 > 1.6 && tm.stepT < st.t + 0.5) return; /* il continue de s'engager tant que l'intervalle est ouvert */
    if (tm.stepT >= st.t || hot) { stopDrib(p); if (st.sh !== undefined) aiShoot(p, st.sh); else { const q = mate(t, st.to); if (!q) { tm.combo = null; tm.step = -1; } else if (hyp(q.x - p.x, q.z - p.z) > 1.4 || tm.stepT > st.t + 0.7 || hot) startPass(p, q); } }
    return;
  }
  if (p.role === PVT) { p.face = Math.atan2(-p.z, dir * HALF_L - p.x); if (a.t > 0.22) aiShoot(p, zd < 7.6 ? SH_PLONG : -1); return; }
  const wing = p.role === ALG || p.role === ALD;
  if (tm.tempo === 0) {
    /* TEMPS FAIBLE : circulation posée, de voisin à voisin, chacun menace un pas puis donne */
    if (wing) { if (a.t < 0.5) return; if (zd < 8.3 && nd > 1.0 && (warn || nd > 3.2)) { aiShoot(p, -1); return; } tm.circ = p.role === ALG ? 1 : -1; passNeighbour(p, tm, t, 0); return; }
    if (a.mode === 0) {
      const r = rnd(); a.mode = 3;
      if ((p.role === ARG || p.role === ARD) && !warn && tm.passes >= 3 && rnd() < 0.07) { const q = mate(t, p.role === ARG ? ALG : ALD); if (q && uOf(q.x, dir) < 3.2 && nearOpp(q) > 1.4 && startKungfu(p, q)) return; }
      if (warn || tm.passes >= tm.strongAt) {
        if (!warn && p.role === DC && r < 0.4) { tm.passes = 0; startCombo(t, rnd() < 0.5 ? 0 : 1, -1); return; }
        if (!warn && p.role === ARD && r < 0.18) { tm.passes = 0; startCombo(t, 2, -1); return; }
        tm.tempo = 1; tm.tempoN = 0; a.mode = 0; evt('temps-fort', t, p.id); if (t === 0) { S.comboMsg = 'Temps fort'; S.comboN++; }
      } else { const ap = arcPoint(arcT(u, w, 10), max(9.6, zd - 0.9)); a.tx = dir * (HALF_L - ap[0]); a.tz = dir * ap[1]; }
    }
    if (tm.tempo === 0) {
      if (p.steps < 2 && a.t < 0.5) { p.tx = a.tx; p.tz = a.tz; p.tsp = 3.4; }
      if (zd < 8.6 && nd > 2.8 && a.t > 0.3) { aiShoot(p, -1); return; }
      if (a.t > 0.62 + 0.3 * hash1(p.id + tm.passes)) passNeighbour(p, tm, t, 0.06);
      return;
    }
  }
  /* TEMPS FORT : le porteur attaque en accélération l'intervalle libre suivant ; s'il est libre il tire, sinon il fixe et décale */
  if (wing) {
    if (a.t < 0.14) return;
    if (zd < 8.6 && nd > 0.9) { aiShoot(p, -1); return; }
    tm.circ = p.role === ALG ? 1 : -1; tm.tempoN++; /* pas d'ouverture : ça revient */
    if (tm.tempoN >= 2) { tm.tempo = 0; tm.passes = 1; tm.strongAt = 3 + Math.floor(rnd() * 3); }
    passNeighbour(p, tm, t, 0); return;
  }
  if (a.mode !== 4) { a.mode = 4; const ap = arcPoint(nextGap(p, t, tm.circ), 7.7); a.tx = dir * (HALF_L - ap[0]); a.tz = dir * ap[1]; }
  if (!p.drib && !p.dribbled && p.steps >= 2) { p.drib = true; p.holdT = 0; }
  if (p.drib || p.steps < 3) { p.tx = a.tx; p.tz = a.tz; p.tsp = p.vmax; p.faceOn = false; }
  if (zd < 9.0 && nd > 1.9 && p.contact <= 0 && a.t > 0.2) { stopDrib(p); aiShoot(p, -1); return; }
  if (nd < 1.8 || zd < 8.2 || a.t > 1.0 || p.contact > 0) { stopDrib(p); if (zd < 8.0 && nd > 1.2 && p.contact <= 0) { aiShoot(p, -1); return; } passNeighbour(p, tm, t, 0.28); }
}

function aiAttack(t, h) {
  const tm = S.tm[t], dir = S.dir[t], b = S.ball, bu = uOf(b.x, dir), bw = dir * b.z;
  if (tm.st === TRANS && bu < 13 && b.state !== B_FLY) tm.st = PLACED;
  if (tm.st === TRANS || S.setPiece) tm.tempo = 0;
  if (tm.combo) comboUpdate(t, tm, h); else tm.next = -1;
  const steps = tm.combo && tm.step >= 0 ? tm.combo.variants[tm.vi].steps[tm.step] : null;
  for (let r = 1; r < 7; r++) {
    const p = S.P[t * 7 + r]; if (p.off || p === h || p.act === A_SHOOT) continue;
    const base = ATK_BASE[r], wing = r === ALG || r === ALD; let u = base[0], w = base[1], sp = 4.4;
    if (tm.st === TRANS) { sp = p.vmax; if (wing) u = 2.4; else if (r === PVT) { u = 7.2; w = 0; } else u = max(base[0], bu - 2.5); }
    else if (r === PVT) { const ap = arcPoint(clamp(arcT(bu, bw, 6.8) * 0.45, -0.33, 0.33), 6.85); u = ap[0]; w = ap[1]; }
    else if (!wing) { const adj = h && abs(chainIdx(r) - chainIdx(h.role)) === 1; u = base[0] + (adj ? -0.3 : 0.9); if (tm.tempo === 1 && h && CH_IDX[h.role] >= 0 && chainIdx(r) === chainIdx(h.role) + tm.circ) { u = base[0] - 1.9; w = base[1] * 0.9; sp = 6.4; } } /* temps fort : le suivant arrive lancé */
    if (S.auto && tm.st !== TRANS) { u = max(0.6, u + tm.jit[2 * r]); w += tm.jit[2 * r + 1]; }
    let viaCombo = false;
    if (steps) { const mv = steps.mv[r]; if (mv) { u = mv[0]; w = mv[1]; sp = 6.4; viaCombo = true; if ((r === PVT || r === tm.combo.start) && nearOpp(p) < 1.2 && _no) _no.ai.cd = max(_no.ai.cd, 0.6); } } // écran : le défenseur pris dans le bloc est retenu un instant
    p.tx = dir * (HALF_L - u); p.tz = dir * w; p.tsp = sp;
    if (p.recv && b.kind === K_PASS && b.target === p.id && !viaCombo) { p.tx = b.tx; p.tz = b.tz; p.tsp = 6; }
    p.stance = r === PVT && tm.st !== TRANS ? 1 : 0; p.faceOn = hyp(p.vx, p.vz) < 3.2 || p.recv > 0; p.face = Math.atan2(b.z - p.z, b.x - p.x); p.ai.mode = 0;
  }
  if (h && h.team === t && !h.ctrl) aiHolder(h, tm, t);
}

function aiDefend(t, h) {
  const at = 1 - t, dirA = S.dir[at], sys = DEF_SYS[DEF_NAMES[S.defSys[t]]], b = S.ball, bu = uOf(b.x, dirA), bw = dirA * b.z, bt = arcT(bu, bw, 7);
  const c = h && h.team === at ? h : (b.kind === K_PASS && b.target >= 0 ? S.P[b.target] : null);
  let cu = 0, cw = 0, czd = 99, near = -1, nd = 9;
  if (c && c.role !== GB && !S.setPiece) {
    cu = uOf(c.x, dirA); cw = dirA * c.z; czd = zoneDist(cu, cw);
    const ct0 = arcT(cu, cw, 7); for (let r = 1; r < 7; r++) { const p = S.P[t * 7 + r]; if (p.off) continue; const s0 = sys[DEF_SLOT[r]], d = (s0[1] > 7.5 ? abs(clamp(bt * 0.8, -0.6, 0.6) - ct0) * 0.6 : abs(s0[0] + (bt - s0[0]) * 0.36 - ct0)) + (p.ai.cd > 0 ? 1 : 0) + hyp(p.x - c.x, p.z - c.z) * 0.012; if (d < nd) { nd = d; near = r; } }
  }
  /* temps de réaction de la défense à chaque changement de porteur, plus long quand une combinaison vient de la déplacer */
  { const cid = c ? c.id : -1; if (cid !== DEF_C[t]) { DEF_C[t] = cid; DEF_LAG[t] = S.tm[at].combo && S.tm[at].step >= 1 ? 0.5 : 0.16; } if (DEF_LAG[t] > 0) { DEF_LAG[t] -= DT; near = -1; } }
  for (let r = 1; r < 7; r++) {
    const p = S.P[t * 7 + r]; if (p.off) continue;
    const slot = DEF_SLOT[r]; let tt = sys[slot][0], d = sys[slot][1], mode = 0, sp = 5.2;
    if (d > 9) tt = clamp(bt * 0.8, -0.6, 0.6); else if (d > 7.5) tt += (bt - tt) * 0.45; else tt += (bt - tt) * 0.36; // le bloc coulisse côté ballon
    if (p.ai.cd > 0) { p.ai.cd -= DT; sp = 1.5; }
    else if (r === near && czd < 11.8) { d = clamp(czd - 0.85, d, max(d, 8.5)); tt = arcT(cu, cw, d); mode = h === c ? 1 : 0; sp = p.vmax; } // sort à 8-9 m et attend le porteur, sans monter plus haut
    const ap = arcPoint(tt, d), x = dirA * (HALF_L - ap[0]), z = dirA * ap[1];
    const far = hyp(x - p.x, z - p.z), threat = hyp(b.x - p.x, b.z - p.z); if (far > 6) sp = p.vmax; if (far > 5 && threat > 9) p.ai.bk = 0; else if (far < 3 || threat < 7) p.ai.bk = 1; // danger proche : repli à reculons, face au porteur
    if (S.setPiece && S.rs.type !== 'renvoi') { const dx = x - S.rs.x, dz = z - S.rs.z, dd = hyp(dx, dz); if (dd < 3.1 && d > 6.9 && dd > 0.01) { p.tx = S.rs.x + dx / dd * 3.1; p.tz = S.rs.z + dz / dd * 3.1; } else { p.tx = x; p.tz = z; } }
    else { p.tx = x; p.tz = z; }
    if (p.ctrl) continue;
    p.tsp = sp; p.ai.mode = mode; p.faceOn = p.ai.bk !== 0; p.face = Math.atan2(b.z - p.z, b.x - p.x); // repli : on court face à son but, on ne se retourne qu'en arrivant
    p.stance = bu < 15 ? (mode || (c && hyp(c.x - p.x, c.z - p.z) < 4) ? 2 : 1) : 0;
    if (c && c.act === A_SHOOT && !c.released && c.at > 0.1 && p.act === A_NONE && p.y <= 0.02 && hyp(c.x - p.x, c.z - p.z) < (FREE_JUMP[c.shot] ? 1.3 : 2.3) && (r === near || !FREE_JUMP[c.shot])) { p.act = A_BLOCK; p.at = 0; p.ad = 0.55; if (SHOTS[c.shot].jump > 0) { p.vy = 3.1; p.y = 0.021; } }
  }
}
function aiKeeper(g, t, h) {
  if (g.off || g.act === A_SAVE || g === h || g.ctrl) return;
  const b = S.ball, s = -S.dir[t], gx = s * HALF_L; let dx = b.x - gx, dz = b.z; const d = hyp(dx, dz) || 1;
  const tk = S.train && S.train.kind === 'tir' ? SHOTS[S.train.shot].k : '', off = tk === 'lob' || tk === 'chabala' ? 3.3 : tk === 'roucoulette' ? 3.0 : d > 22 ? 2.7 : clamp(0.55 + (d - 6) * 0.1, 0.6, 1.25);
  let off2 = off; if (h && h.team !== t && h.role !== GB && off < 2) { const zh = zoneDist(HALF_L - s * h.x, h.z); if (zh < 9.6 && nearOpp(h) > 1.7) off2 = abs(h.z) < 5 ? 2.5 : 1.5; } // duel : le gardien sort réduire l'angle
  g.tx = gx + dx / d * off2; g.tz = clamp(dz / d * off2 * 1.25, -1.25, 1.25) * (off2 > 2 ? 0.4 : 1); if (S.setPiece && S.rs.type === '7m') { g.tx = gx - s * -1 * 0 + (b.x > gx ? 1 : -1) * 2.2; g.tz = 0; } g.tsp = 4; g.faceOn = true; g.face = Math.atan2(b.z - g.z, b.x - g.x); g.stance = 0;
  if (b.state === B_LOOSE && zoneDist(HALF_L - s * b.x, b.z) < R6) { g.tx = b.x; g.tz = b.z; g.tsp = g.vmax; }
}
function aiLoose() {
  const b = S.ball;
  for (let t = 0; t < 2; t++) {
    let best = null, bd = 1e9;
    for (let r = 1; r < 7; r++) { const p = S.P[t * 7 + r]; if (p.off || p.ctrl) continue; const d = hyp(p.x - b.x, p.z - b.z); if (d < bd) { bd = d; best = p; } }
    if (best && zoneDist(HALF_L - abs(b.x), b.z) > R6 - 0.2) { best.tx = b.x + b.vx * 0.25; best.tz = b.z + b.vz * 0.25; best.tsp = best.vmax; best.faceOn = false; }
  }
}
function aiDead() {
  const r = S.rs, ta = r.team, dirA = S.dir[ta], b = S.ball, type = r.type;
  for (let i = 0; i < 14; i++) {
    const p = S.P[i]; if (p.off) continue;
    p.stance = 0; p.face = Math.atan2(b.z - p.z, b.x - p.x); p.ai.mode = 0; p.ctrl = false; p.tsp = 6.2; p._dead = 1;
    if (S.phase === 'play' && p.id === r.exec) continue;
    if (p.id === r.exec) { if (type === 'renvoi') { p.tx = -dirA * 17.2; p.tz = 0; } else { p.tx = r.x; p.tz = r.z; } continue; }
    if (p.team === ta) {
      if (p.role === GB) { p.tx = -dirA * 19.2; p.tz = 0; continue; }
      const b0 = ATK_BASE[p.role]; let u = b0[0], w = b0[1];
      if (type === 'eng') { p.tx = -dirA * (b0[0] > 9 ? 1.6 : 0.9); p.tz = dirA * (p.role === PVT ? 2.6 : w * 0.95); continue; }
      if ((type === '7m' || type === 'jf') && zoneDist(u, w) < 9.5) { const ap = arcPoint(arcT(u, w, 9.6), 9.6); u = ap[0]; w = ap[1]; }
      p.tx = dirA * (HALF_L - u); p.tz = dirA * w;
    } else {
      if (p.role === GB) { p.tx = dirA * (type === '7m' ? HALF_L - 3.3 : 19.2); p.tz = 0; p.faceOn = true; continue; } /* sur un jet de 7 m, le gardien avance vers sa ligne des 4 m */
      const sys = DEF_SYS[DEF_NAMES[S.defSys[p.team]]], slot = DEF_SLOT[p.role]; let tt = sys[slot][0], d = sys[slot][1];
      if (type === '7m') { tt = (slot - 2.5) * 0.17; d = 9.6; }
      const ap = arcPoint(tt, d); let x = dirA * (HALF_L - ap[0]), z = dirA * ap[1];
      if (type !== '7m' && type !== 'renvoi') { const dx = x - r.x, dz = z - r.z, dd = hyp(dx, dz); if (dd < 3.1 && d > 6.9 && dd > 0.01) { x = r.x + dx / dd * 3.1; z = r.z + dz / dd * 3.1; } }
      p.tx = x; p.tz = z; p.stance = hyp(x - p.x, z - p.z) < 2.2 ? 1 : 0;
    }
  }
  /* temps mort : chaque équipe se regroupe devant son banc, puis revient */
  if (r.tmo && r.t < r.wait - 3.6) for (let i = 0; i < 14; i++) { const p = S.P[i]; if (p.off) continue; p.tx = (p.team ? 7.5 : -7.5) + (p.role - 3) * 0.75; p.tz = -9.3 + (p.role & 1) * 0.9; p.stance = 0; p._dead = 1; }
  // allure et orientation : trottiner face à la course, ne se retourner vers le ballon qu'à l'approche (avec hystérésis)
  for (let i = 0; i < 14; i++) { const p = S.P[i]; if (p.off || !p._dead) continue; p._dead = 0; const dT = hyp(p.tx - p.x, p.tz - p.z), left = r.wait - r.t;
    if (dT < 2.6) p.ai.bk = 1; else if (dT > 4) p.ai.bk = 0; p.faceOn = p.ai.bk === 1 || p.role === GB && dT < 6;
    const lag = type === 'eng' ? 0.25 + 0.9 * hash1(p.id * 3.7 + S.score[0] + S.score[1]) : 0.15 * hash1(p.id * 1.3), pace = 0.86 + 0.28 * hash1(p.id * 5.1 + S.score[1]);
    p.tsp = r.t < lag ? 1.3 : dT < 1.6 ? 1.6 : clamp(dT / max(0.4, left - 0.5), (type === 'eng' ? 3.7 : 3.8) * pace, p.vmax); }
}
function aiRefs() {
  const b = S.ball, t = S.poss < 0 ? 0 : S.poss, dir = S.dir[t], bu = uOf(b.x, dir), a = S.P[dir > 0 ? 14 : 15], g = S.P[dir > 0 ? 15 : 14], sd = a.z >= 0 ? 1 : -1, sg2 = g.z >= 0 ? 1 : -1;
  a.tx = dir * (HALF_L - (min(bu, 13) + 8.5)); a.tz = sd * 6.5; a.tsp = hyp(a.tx - a.x, a.tz - a.z) > 6 ? 4.6 : 2.6; if (abs(a.x) > HALF_L - 0.2) a.tz = sd * 9; if (S.setPiece && S.rs.type === '7m' || S.phase === 'dead' && S.rs.type === '7m') { a.tx = dir * (HALF_L - 9.5); a.tz = sd * 7; } if (a.sig === 0) { a.faceOn = hyp(a.vx, a.vz) < 1.2; a.face = Math.atan2(b.z - a.z, b.x - a.x); } else a.faceOn = true;
  g.tx = dir * (HALF_L + 0.7); g.tz = sg2 * 5.2; g.tsp = hyp(g.tx - g.x, g.tz - g.z) > 6 ? 4.6 : 2.6; if (abs(g.x) < HALF_L + 0.3 && abs(g.z) < 8.6) { g.tz = sg2 * 9.2; if (abs(g.z) < 8.2 && zoneDist(HALF_L - dir * g.x, g.z) < 8) g.tx = g.x; } g.faceOn = hyp(g.vx, g.vz) < 1.2; g.face = Math.atan2(b.z - g.z, b.x - g.x);
}

// ---------- joueur dirigé
function chooseCtl() {
  for (let i = 0; i < 14; i++) S.P[i].ctrl = false; S.ctl = -1; if (S.auto) return;
  const b = S.ball, h = holder();
  if (S.poss === 0) { if (h && h.team === 0 && h.role !== GB) S.ctl = h.id; S.sel = -1; }
  else {
    let cur = S.sel >= 1 && S.sel < 7 && !S.P[S.sel].off ? S.sel : -1;
    if (cur < 0 || S.inp.sw) { let bd = 1e9, best = -1; for (let r = 1; r < 7; r++) { const p = S.P[r]; if (p.off || r === cur) continue; const d = hyp(p.x - b.x, p.z - b.z); if (d < bd) { bd = d; best = r; } } if (best > 0) cur = best; }
    S.sel = cur; S.ctl = cur;
  }
  if (S.ctl >= 0) S.P[S.ctl].ctrl = true;
}
function userControl() {
  const i = S.inp;
  if (S.ctl >= 0) {
    const p = S.P[S.ctl], h = holder(), dir = S.dir[0], ml = hyp(i.mx, i.mz), b = S.ball;
    if (p === h) {
      p.stance = 0; const free = !S.setPiece && !p.act;
      if (ml > 0.2 && free && !S.charging) { p.tx = p.x + i.mx / ml * 3; p.tz = p.z + i.mz / ml * 3; p.tsp = p.vmax * min(1, ml); }
      else if (!S.charging || S.setPiece) { p.tx = p.x; p.tz = p.z; p.tsp = 0; }
      if (!p.act) { p.faceOn = true; p.face = S.charging || ml < 0.2 ? Math.atan2(-p.z * 0.6, dir * HALF_L - p.x) : Math.atan2(i.mz, i.mx); }
      if (i.drib && free && !S.charging) { if (!p.drib) { if (p.dribbled) { violation(p, 'reprise-dribble', 'Reprise de dribble'); return; } p.drib = true; p.holdT = 0; } } else if (p.drib) stopDrib(p);
      if (i.shoot && !p.act) { if (!S.charging) { S.charging = true; S.charge = 0; stopDrib(p); } S.charge = min(1, S.charge + DT / 0.8); p.armed = true; }
      else if (S.charging) {
        S.charging = false;
        if (!p.act) { let type = S.setPiece && S.rs.type === '7m' ? SH_7M : i.shotSel > 0 ? i.shotSel - 1 : chooseShot(p); const sd = p.z > 0.4 ? 1 : p.z < -0.4 ? -1 : (p.lefty ? 1 : -1) * dir; startShot(p, type, 0.2 + sat(i.aimV) * 1.55, -sd * clamp(i.aimH, -1, 1) * 1.25, 0.6 + 0.4 * S.charge); S.tm[0].combo = null; S.tm[0].step = -1; }
      }
      if (i.pass && !p.act) {
        S.charging = false; let q = null; const tm = S.tm[0];
        if (tm.combo && tm.next >= 0 && ml < 0.2) q = mate(0, tm.next);
        if (!q) { let bs = -1e9; for (let r = 1; r < 7; r++) { const m = S.P[r]; if (m.off || m === p) continue; const dx = m.x - p.x, dz = m.z - p.z, d = hyp(dx, dz) || 1; const s = ml > 0.2 ? ((dx * i.mx + dz * i.mz) / (d * ml) - 0.3) * 10 - d * 0.12 : -d; if (s > bs && (ml < 0.2 || s > -3)) { bs = s; q = m; } } }
        if (q) { stopDrib(p); startPass(p, q); }
      }
      if (i.feint && free && ml > 0.2) { p.act = A_FEINT; p.at = 0; p.ad = 0.3; p.passDz = (-i.mx * sin(p.yaw) + i.mz * cos(p.yaw)); p.vx = i.mx / ml * 6.2; p.vz = i.mz / ml * 6.2; nearOpp(p); if (_no && hyp(_no.x - p.x, _no.z - p.z) < 2.2) _no.ai.cd = 0.6; evt('feinte', 0, p.id); }
      if (i.kf && free) { let q = null, bd = 1e9; for (const r of R_KF) { const m = mate(0, r); if (!m || m === p) continue; const d = hyp(m.x - p.x, m.z - p.z) - (ml > 0.2 ? ((m.x - p.x) * i.mx + (m.z - p.z) * i.mz) / ml : 0); if (d < bd) { bd = d; q = m; } } if (q) { stopDrib(p); startKungfu(p, q); } }
      if (i.combo >= 0 && i.combo < COMBOS.length && !S.setPiece) startCombo(0, i.combo, -1);
    } else {
      if (ml > 0.2) { p.tx = p.x + i.mx / ml * 3; p.tz = p.z + i.mz / ml * 3; p.tsp = p.vmax * min(1, ml); } else { p.tx = p.x; p.tz = p.z; p.tsp = 0; }
      p.stance = 2; p.faceOn = true; p.face = Math.atan2(b.z - p.z, b.x - p.x); p.ai.mode = i.tackle ? 1 : 0;
      if (i.block && !p.act && p.y <= 0.02) { p.act = A_BLOCK; p.at = 0; p.ad = 0.55; p.vy = 3.2; p.y = 0.021; }
    }
  }
  if (i.tmo) requestTimeout(0);
  i.pass = i.feint = i.sw = i.block = i.kf = i.tmo = false; i.combo = -1;
}
function aiPlay() {
  const b = S.ball, h = holder();
  chooseCtl();
  if (S.setPiece && S.rs.type === '7m') { aiDead(); if (h && !h.ctrl) aiHolder(h, S.tm[h.team], h.team); if (h && h.ctrl) h.ctrl = true; }
  else {
    const at = S.poss < 0 ? b.lastTeam : S.poss;
    aiAttack(at, h); aiDefend(1 - at, h); aiKeeper(S.P[0], 0, h); aiKeeper(S.P[7], 1, h);
    if (b.state === B_LOOSE) aiLoose();
  }
  if (S.ctl >= 0) S.P[S.ctl].ctrl = true;
  userControl();
  if (S.auto && S.half === 1 && S.poss >= 0 && S.score[1 - S.poss] - S.score[S.poss] >= 3 && S.tmoHalf[S.poss] === 0 && rnd() < 0.002) requestTimeout(S.poss); /* l'IA demande un temps mort quand elle est menée */
  if (S.train) { S.train.t += DT; if ((S.poss !== 0 || S.train.t > 12) && S.train.reset <= 0) S.train.reset = 1.2; }
}

// ---------- entraînement : rejoue une combinaison ou un tir à la demande
function setupTrain() {
  const tr = S.train; tr.reset = 0; tr.t = 0; S.phase = 'play'; S.auto = true; S.dir[0] = 1; S.dir[1] = -1; S.setPiece = false; S.poss = 0; S.pas.t = 0; S.pas.warn = false;
  for (let i = 0; i < 14; i++) {
    const p = S.P[i]; p.off = false; p.susp = 0; p.act = A_NONE; p.y = 0; p.vx = p.vy = p.vz = 0; p.drib = false; p.recv = 0; p.svOn = false; p.contact = 0; p.ai.cd = 0;
    if (p.team === 0) { const b0 = ATK_BASE[p.role]; p.x = p.role === GB ? -19 : HALF_L - b0[0]; p.z = p.role === GB ? 0 : b0[1]; p.yaw = 0; }
    else { if (p.role === GB) { p.x = 19.2; p.z = 0; } else { const s = DEF_SYS[DEF_NAMES[S.defSys[1]]][DEF_SLOT[p.role]], ap = arcPoint(s[0], s[1]); p.x = HALF_L - ap[0]; p.z = ap[1]; } p.yaw = PI; }
    p.tx = p.x; p.tz = p.z;
  }
  S.tm[0] = mkTm(); S.tm[1] = mkTm();
  let who = DC;
  if (tr.kind === 'combo') who = COMBOS[tr.ci].start;
  else { const k = SHOTS[tr.shot].k; if (k === 'plongeant') { S.P[PVT].x = HALF_L - 6.5; S.P[PVT].z = 0; S.P[PVT].tx = S.P[PVT].x; S.P[PVT].tz = 0; } // dans l'intervalle entre les deux défenseurs centraux
    who = k === 'ailier' || k === 'roucoulette' ? ALG : k === 'plongeant' ? PVT : k === 'kungfu' ? ARG : DC; const p = S.P[who]; if (who === ALG) { p.x = HALF_L - 1.7; p.z = -9.3; for (let r = 1; r < 7; r++) { const o = S.P[7 + r]; if (r === ALD) { o.ai.cd = 1.4; const ap = arcPoint(-0.55, 6.4); o.x = HALF_L - ap[0]; o.z = ap[1]; o.tx = o.x; o.tz = o.z; continue; } /* défenseur d'aile resserré vers l'intérieur : le couloir est ouvert */ o.off = true; o.x = 2 + r; o.z = -10.6; } if (k === 'roucoulette') { S.P[7].x = HALF_L - 2.7; S.P[7].z = -1.9; } } /* tir d'aile : l'ailier seul face au gardien, son défenseur en retard */ else if (who === DC) { p.x = HALF_L - (k === 'chabala' || k === 'lob' ? 12.5 : k === 'suspension' || k === 'desaxe' ? 13.4 : 11.8); p.z = k === 'chabala' ? -1.0 : 0.4; if (k === 'chabala' || k === 'lob') for (let r = 1; r < 7; r++) { const o = S.P[7 + r]; o.off = true; o.x = 2 + r; o.z = -10.6; } } }
  S.P[14].x = HALF_L - 16; S.P[14].z = 5.5; S.P[15].x = HALF_L + 0.7; S.P[15].z = 5.2;
  if (tr.kind === 'tir' && SHOTS[tr.shot].k === '7m') { S.poss = 0; tr.hold = true; startRestart('7m', 0, 0, 0); return; }
  S.poss = -1; give(S.P[who]); S.tm[0].st = PLACED; S.P[who].zeroStep = false;
  if (tr.kind === 'combo') startCombo(0, tr.ci, tr.vi);
}
function startTrain(kind, a, b) { initPlayers(); S.train = { kind, ci: a, vi: b, shot: a, reset: 0, t: 0 }; S.score[0] = S.score[1] = 0; S.clock = 0; setupTrain(); }
