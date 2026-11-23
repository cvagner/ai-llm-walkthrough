// Simulation à pas fixe (1/60 s), déterministe : ballon, règles, arrêts et reprises du jeu.
const DT = 1 / 60;
const B_HELD = 0, B_FLY = 1, B_LOOSE = 2, B_NET = 3;
const K_NONE = 0, K_PASS = 1, K_SHOT = 2;
const TRANS = 0, PLACED = 1, COMBO = 2;
const mkTm = () => ({ st: TRANS, combo: null, ci: -1, vi: 0, step: -1, stepT: 0, circ: 1, passes: 0, next: -1, tempo: 0, tempoN: 0, strongAt: 4 });
const S = {
  P: [], ball: { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, spin: 0, state: B_LOOSE, holder: -1, kind: K_NONE, target: -1, shooter: -1, lastTeam: 0, lastP: -1, fly: 0, seen: 0, curve: false, cx: 0, cz: 0, bounces: 0, shotType: 0, hitCd: 0, tx: 0, tz: 0, looseT: 0 },
  phase: 'menu', clock: 0, half: 0, halfLen: 300, score: [0, 0], dir: [1, -1], poss: 0,
  rs: { type: '', team: 0, x: 0, z: 0, t: 0, wait: 0, exec: -1 }, setPiece: false,
  pas: { t: 0, warn: false, passes: 0 }, tm: [mkTm(), mkTm()], defSys: [0, 2], auto: false, sel: -1, ctl: -1, charge: 0, charging: false,
  inp: { mx: 0, mz: 0, pass: false, shoot: false, drib: false, feint: false, kf: false, shotSel: 0, combo: -1, sw: false, tackle: false, block: false, aimH: 0, aimV: 0.5 },
  msg: '', msgT: 0, msgN: 0, ev: [], t: 0, netT: -9, netY: 1, netZ: 0, netS: 1, cheer: 0, yellows: [0, 0], train: null, comboMsg: '', comboN: 0, lastShot: -1, saveT: 0, tmoUsed: [0, 0], tmoHalf: [0, 0],
};
const PLAYERS = S.P;
const uOf = (x, dir) => HALF_L - dir * x;
const CH_IDX = [-1, 0, 1, 2, 3, 4, -1]; /* rang dans la chaîne ailier-arrière-demi-centre-arrière-ailier */
function evt(code, team, a) { if (AQ.length < 128) AQ.push(code, team); /* file lue par le son */ if (S.ev.length < 4000) S.ev.push({ t: +S.t.toFixed(2), c: code, team, a }); }
function say(text, dur) { S.msg = text; S.msgT = dur || 2.2; S.msgN++; }

function initPlayers() {
  if (S.P.length) return;
  const nums = [[1, 7, 9, 10, 13, 23, 18], [16, 4, 8, 5, 11, 21, 3]];
  /* gabarits par poste, en mètres : ailiers plus petits et vifs, arrières et pivot grands, pivot plus lourd */
  const HMIN = [1.90, 1.70, 1.87, 1.85, 1.87, 1.70, 1.88], HMAX = [1.97, 1.85, 1.95, 1.92, 1.95, 1.85, 1.95], bd = [1.06, 0.9, 1.04, 1.0, 1.04, 0.9, 1.26], H1 = 1.88; /* taille du squelette pour h = 1 */
  for (let t = 0; t < 2; t++) for (let r = 0; r < 7; r++) {
    const id = t * 7 + r;
    S.P.push(mkPlayer(id, t, r, nums[t][r], r === ARD || r === ALD, lerp(HMIN[r], HMAX[r], hash1(id * 2.7 + 3)) / H1, bd[r] * (0.97 + 0.06 * hash1(id * 1.9)), Math.floor(hash1(id * 3.1 + 1) * 5), Math.floor(hash1(id * 5.7 + 2) * 5)));
  }
  for (let i = 0; i < 2; i++) { const p = mkPlayer(14 + i, -1, 1, 0, false, 0.98, 1, 1 + i, 3); p.vmax = 5.5; S.P.push(p); }
}
function placeTeams() {
  for (let i = 0; i < 14; i++) {
    const p = S.P[i], dir = S.dir[p.team], b = ATK_BASE[p.role];
    p.x = p.role === GB ? -dir * 19.2 : -dir * (2 + (b[0] > 5 ? 3 : 1.5) + (p.role === PVT ? 2 : 0)); p.z = p.role === GB ? 0 : dir * (p.role === PVT ? 3 : b[1] * 0.9); p.y = 0; p.vx = p.vy = p.vz = 0; p.yaw = dir > 0 ? 0 : PI; p.act = A_NONE; p.tx = p.x; p.tz = p.z;
  }
  S.P[14].x = 0; S.P[14].z = -7; S.P[15].x = 12; S.P[15].z = 8;
}
function initMatch(seed, halfLen) {
  srand(seed || 20261118); initPlayers();
  S.clock = 0; S.half = 0; S.halfLen = halfLen || 300; S.score[0] = S.score[1] = 0; S.dir[0] = 1; S.dir[1] = -1; S.ev.length = 0; S.t = 0; S.yellows[0] = S.yellows[1] = 0; S.tmoUsed[0] = S.tmoUsed[1] = 0; S.tmoHalf[0] = S.tmoHalf[1] = 0;
  S.train = null; S.tm[0] = mkTm(); S.tm[1] = mkTm(); S.sel = -1; S.ctl = -1; S.cheer = 0;
  for (const p of S.P) { p.susp = 0; p.off = false; p.yellow = false; p.twoMin = 0; p.disq = false; p.act = A_NONE; p.drib = false; p.ctrl = false; p.stance = 0; p.sig = 0; }
  placeTeams(); S.poss = 1; startRestart('eng', 0, 0, 0);
}

// ---------- possession
function give(p) {
  const b = S.ball; b.state = B_HELD; b.holder = p.id; b.kind = K_NONE; b.target = -1; b.vx = b.vy = b.vz = 0; b.lastTeam = p.team; b.lastP = p.id; b.curve = false;
  p.steps = 0; p.ffSeen = p.ff; p.zeroStep = hyp(p.vx, p.vz) > 1.2 || p.y > 0.02; p.holdT = 0; p.drib = false; p.dribbled = false; p.armed = false; p.ai.t = 0; p.ai.mode = 0;
  for (let i = 0; i < 14; i++) S.P[i].recv = 0;
  if (S.poss !== p.team) {
    S.poss = p.team; S.pas.t = 0; S.pas.warn = false; S.pas.passes = 0;
    const tm = S.tm[p.team]; tm.st = TRANS; tm.combo = null; tm.step = -1; tm.passes = 0; tm.tempo = 0; tm.strongAt = 3 + Math.floor(rnd() * 3); S.tm[1 - p.team].combo = null; S.tm[1 - p.team].step = -1; evt('possession', p.team);
  }
}
function holder() { const b = S.ball; return b.state === B_HELD ? S.P[b.holder] : null; }
function pickExec(type, team, x, z) {
  const o = team * 7;
  if (type === 'renvoi') return o + GB;
  if (type === '7m' || type === 'eng') { for (const r of [DC, ARG, ARD, PVT, ALG, ALD]) if (!S.P[o + r].off) return o + r; }
  let best = -1, bd = 1e9; for (let r = 1; r < 7; r++) { const p = S.P[o + r]; if (p.off) continue; const d = hyp(p.x - x, p.z - z); if (d < bd) { bd = d; best = p.id; } } return best;
}
function startRestart(type, team, x, z) {
  const b = S.ball, r = S.rs, prev = S.poss;
  S.phase = 'dead'; r.type = type; r.team = team; r.t = 0; r.tmo = false; r.wait = type === 'eng' ? 3.4 : type === '7m' ? 3.6 : type === 'renvoi' ? 1.6 : 2.5; S.setPiece = false;
  const dir = S.dir[team];
  if (type === 'eng') { x = -dir * 0.2; z = 0; } else if (type === '7m') { x = dir * (HALF_L - D7 - 0.25); z = 0; } else if (type === 'touche') { z = (z < 0 ? -1 : 1) * 9.95; x = clamp(x, -19.6, 19.6); }
  r.x = x; r.z = z; r.exec = pickExec(type, team, x, z);
  if (b.state === B_HELD) { b.state = B_LOOSE; b.holder = -1; }
  b.kind = K_NONE; b.target = -1;
  for (let i = 0; i < 14; i++) { const p = S.P[i]; p.drib = false; p.armed = false; p.recv = 0; p.contact = 0; p.ctrl = false; }
  S.tm[0].combo = null; S.tm[1].combo = null; S.tm[0].step = S.tm[1].step = -1; S.tm[0].tempo = S.tm[1].tempo = 0; S.charging = false; S.charge = 0;
  if (prev !== team || type === 'eng' || type === '7m') { S.pas.t = 0; S.pas.warn = false; S.pas.passes = 0; }
  S.poss = team; S.P[14].sig = type === '7m' ? 3 : 2; S.P[14].sigT = 1.6; S.P[14].face = dir > 0 ? 0 : PI;
  evt('reprise:' + type, team);
  if (S.train) { if (S.train.hold) S.train.hold = false; else S.train.reset = 1.4; }
}
function freeThrow(team, x, z, text) {
  const dir = S.dir[team], u = uOf(x, dir), w = dir * z;
  // faute dans la propre surface de but du bénéficiaire : renvoi du gardien
  if (zoneDist(HALF_L + dir * x, z) < R6) { say(text + ' — renvoi'); startRestart('renvoi', team, x, z); return; }
  if (zoneDist(u, w) < R9) { const ap = arcPoint(arcT(u, w, R9), R9 + 0.08); x = dir * (HALF_L - ap[0]); z = dir * ap[1]; }
  say(text + ' — jet franc'); startRestart('jf', team, clamp(x, -19.7, 19.7), clamp(z, -9.7, 9.7));
}
/* Temps mort d'équipe (règle 2.10) : trois par match, deux au plus par mi-temps, seulement en possession du ballon. */
function requestTimeout(team) {
  const h = holder(); if (S.phase !== 'play' || S.train || !h || h.team !== team || S.poss !== team || S.tmoUsed[team] >= 3 || S.tmoHalf[team] >= 2) return false;
  S.tmoUsed[team]++; S.tmoHalf[team]++; evt('temps-mort', team); freeThrow(team, h.x, h.z, 'Temps mort ' + (team ? 'Atlas' : 'Hérons')); S.rs.wait = 8.5; S.rs.tmo = true; S.msgT = 4; return true;
}
function violation(p, code, text) { evt(code, p.team, p.id); freeThrow(1 - p.team, p.x, p.z, text); }
function sanction(o, lvl) {
  if (o.role === GB) lvl = 1;
  if (lvl === 1 && !o.yellow && S.yellows[o.team] < 3) { o.yellow = true; S.yellows[o.team]++; evt('avertissement', o.team, o.id); return 'avertissement n° ' + o.num; }
  if (o.role === GB) return '';
  o.twoMin++; o.susp = 120; o.off = true; o.act = A_NONE;
  if (o.twoMin >= 3) { o.disq = true; evt('disqualification', o.team, o.id); return 'disqualification n° ' + o.num; }
  evt('2min', o.team, o.id); return '2 minutes n° ' + o.num;
}

// ---------- tirs et passes
const _aim = new Float32Array(3);
function startShot(p, type, aimY, aimZ, power) {
  const sh = SHOTS[type], dir = S.dir[p.team];
  p.act = A_SHOOT; p.at = 0; p.ad = sh.dur; p.shot = type; p.released = false; p.armed = false; p.drib = false; p.power = power;
  p.aimX = dir * (HALF_L + 0.25); p.aimY = aimY; p.aimZ = aimZ; p.face = Math.atan2(aimZ - p.z, p.aimX - p.x); p.faceOn = true;
  if (sh.jump > 0 && p.y <= 0.02) {
    p.vy = sh.jump; p.y = 0.021;
    const sp = hyp(p.vx, p.vz);
    if (type === SH_AILIER || type === SH_ROUC && abs(p.z) > 5) { const tx = dir * (HALF_L - 4.2), tz = (p.z < 0 ? -1 : 1) * 2.0, d = hyp(tx - p.x, tz - p.z) || 1; p.vx = (tx - p.x) / d * 5.4; p.vz = (tz - p.z) / d * 5.4; }
    else if (type === SH_CHABALA || type === SH_LOB) { const d = hyp(p.aimX - p.x, -p.z) || 1, v = min(3.2, max(sp, 2.6)); p.vx = (p.aimX - p.x) / d * v; p.vz = -p.z / d * v; }
    else if (type === SH_PLONG) { const d = hyp(p.aimX - p.x, -p.z) || 1; p.vx = (p.aimX - p.x) / d * 5.2; p.vz = -p.z / d * 5.2; }
    else if (sp > 2.8) { p.vx *= 2.8 / sp; p.vz *= 2.8 / sp; } // impulsion surtout verticale : pas de passage en force dans le contre
  }
  S.lastShot = type; evt('tir:' + sh.k, p.team, p.id);
  if (type === SH_CHABALA) { // la feinte de tir en force : le gardien part en parade basse avant le lâcher
    const g = S.P[(1 - p.team) * 7]; g.bit = !g.off && (rnd() < 0.9 || !!S.train); // à l'entraînement, la feinte prend toujours
    if (g.bit) { g.act = A_SAVE; g.at = 0; g.svR = sh.dur * sh.rel * 0.80; g.svD = g.svR + 0.16; g.ad = sh.dur + 1.0; g.svOn = true; g.svx = g.x - dir * 0.3; g.svy = 0.45; g.svz = g.z + (rnd() < 0.5 ? -0.6 : 0.6); }
  }
}
function releaseShot(p) {
  const b = S.ball, sh = SHOTS[p.shot], h = ballHand(p), dir = S.dir[p.team];
  p.released = true; if (b.state !== B_HELD || b.holder !== p.id) return;
  b.x = h[0]; b.y = h[1]; b.z = h[2];
  // dispersion : dépend du geste, de la pression et de la puissance demandée
  const press = p.contact > 0 ? 1.6 : 1, pw = p.power, sg = (0.16 + 0.1 * max(0, pw - 0.85) * 6) * press * (p.shot === SH_ROUC || p.shot === SH_CHABALA ? 0.7 : 1);
  let ay = max(0.12, p.aimY + rndN() * sg), az = p.aimZ + rndN() * sg * 1.2; const ax = p.aimX;
  let dx = ax - b.x, dz = az - b.z, D = hyp(dx, dz), t;
  b.curve = false; b.spin = 0;
  if (p.shot === SH_LOB) { t = D / 9.2; ay = min(ay, 1.72); }
  else if (p.shot === SH_CHABALA) { t = max(0.62, D / 5.6); ay = clamp(ay, 0.9, 1.35); }
  else if (p.shot === SH_ROUC) {
    // la roucoulette : ballon brossé qui rebondit à côté du gardien et revient vers le but par son effet
    const g = S.P[(1 - p.team) * 7], ss = p.z >= 0 ? 1 : -1, bx = g.x + dir * 0.1, bz = g.z - ss * 1.45; b.curve = true; b.cx = ax; b.cz = clamp(g.z - ss * 0.75, -1.2, 1.2); b.spin = ss * dir * 60; // contourne le gardien, rebondit au-delà du second poteau, l'effet le ramène dans le but
    dx = bx - b.x; dz = bz - b.z; D = hyp(dx, dz); t = max(0.42, D / 11); ay = BALL_R;
  } else t = D / (sh.v * lerp(0.8, 1.04, sat(pw)));
  b.vx = dx / t; b.vz = dz / t; b.vy = (ay - b.y + 0.5 * G * t * t) / t;
  if (p.shot === SH_CHABALA) {
    const g = S.P[(1 - p.team) * 7], dg = clamp(hyp(g.x - b.x, g.z - b.z), 0.8, D - 0.5), hg = 2.3, yG = 0.95, y0 = b.y;
    // parabole par (0, y0), (dg, hg), (D, yG) : y = y0 + a·x + c·x²
    const c = ((yG - y0) / D - (hg - y0) / dg) / (D - dg), a = (hg - y0) / dg - c * dg;
    if (c < -0.01) { const vh = sqrt(G / (-2 * c)); b.vx = dx / D * vh; b.vz = dz / D * vh; b.vy = a * vh; b.spin = -30; }
  }
  b.state = B_FLY; b.kind = K_SHOT; b.holder = -1; b.shooter = p.id; b.lastTeam = p.team; b.lastP = p.id; b.fly = 0; b.seen = 0; b.bounces = 0; b.shotType = p.shot; b.hitCd = 0;
  S.pas.t = 0; S.pas.warn = false; S.pas.passes = 0; S.setPiece = false;
  gkReact(S.P[(1 - p.team) * 7], p, sh);
}
// Le gardien lit la trajectoire avec un temps de réaction et une erreur, puis engage la main ou le pied le plus proche.
function gkReact(g, shooter, sh) {
  const b = S.ball; if (g.off) return;
  if (sh.k === 'chabala' && g.bit && g.act === A_SAVE) return; // déjà parti sur la feinte : il ne revient pas
  const sgn = b.vx > 0 ? 1 : -1, gOff = HALF_L - abs(g.x), far = hyp(shooter.x - sgn * HALF_L, shooter.z) > R9; let plane = g.x - sgn * 0.3, back = false;
  if (sh.k === 'lob') { // le gardien recule vers sa ligne pendant le vol du ballon : il y arrive si le lob vient de loin
    const D0 = abs(sgn * (HALF_L - 0.55) - b.x), tLine = D0 / max(1, abs(b.vx)), d = clamp(4.4 * (tLine - 0.22), 0, max(0, gOff - 0.55));
    if (d > 0.25 || gOff <= 1.2) { plane = g.x + sgn * d; if (gOff - d < 0.8) plane = sgn * (HALF_L - 0.55); back = true; } }
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, t = 0, cur = b.curve;
  for (let i = 0; i < 240; i++) {
    vy -= G * DT; x += vx * DT; y += vy * DT; z += vz * DT; t += DT;
    if (y < BALL_R) { y = BALL_R; vy = -vy * 0.72; if (cur) { cur = false; const d = hyp(b.cx - x, b.cz - z) || 1, s = max(5.5, hyp(vx, vz) * 0.95); vx = (b.cx - x) / d * s; vz = (b.cz - z) / d * s; vy = max(vy, 2.6); } else { vx *= 0.86; vz *= 0.86; } }
    if (sgn * (x - plane) >= 0) break;
  }
  const fake = sh.k === 'lob' && !far && !back || sh.k === 'roucoulette', bit = fake && rnd() < (sh.k === 'lob' ? 0.5 : 0.78);
  g.bit = bit;
  const tr = 0.17 + 0.05 * rnd() + (bit ? 0.26 : 0) + (back && rnd() < 0.07 ? 0.6 : 0) /* de loin, le gardien se fait rarement surprendre */, sig = clamp(0.37 - 0.42 * t, 0.05, 0.3) * (sh.k === 'roucoulette' ? 1.5 : 1);
  let ty = max(0.1, y + rndN() * sig * 2), tz = z + rndN() * sig * 2;
  if (bit) { if (sh.k === 'roucoulette') { ty = 1.45; tz = g.z + (shooter.z >= 0 ? 1 : -1) * 0.7; } else ty = min(ty, 0.9); } // parti sur la feinte : il se baisse, ou monte les bras côté tireur sur une roucoulette
  const hi = ty > 0.95, side = tz >= g.z ? 1 : -1, nz = g.z + side * (hi ? 0.5 : 0.3), ny = hi ? 1.5 : 0.1;
  const D = hyp(tz - nz, ty - ny), reach = 7.2 * max(0, t - tr), f = D > 1e-3 ? min(1, reach / D) : 1;
  g.act = A_SAVE; g.at = 0; g.svR = tr; g.svD = max(t * 0.98, tr + D / 8.6, tr + 0.07); g.ad = g.svD + 0.55; g.svOn = true;
  g.svx = plane; g.svy = ty; g.svz = clamp(tz, g.z - 1.7, g.z + 1.7); // la main ou le pied part à vitesse limitée : arrive à temps, ou trop tard
  g.tx = back ? plane : g.x; g.tz = clamp(g.z + (g.svz - g.z) * 0.55, -1.6, 1.6); g.tsp = back ? g.vmax : 4.2; if (back) g.svz = clamp(tz, -1.45, 1.45);
  if (hi && g.svy > 1.9) { g.vy = 2.6; g.y = 0.021; }
}
function startPass(p, q) {
  if (!q || q.off || p.act) return false;
  const dx = q.x - p.x, dz = q.z - p.z, d = hyp(dx, dz) || 1;
  p.act = A_PASS; p.at = 0; p.ad = 0.24; p.passTo = q.id; p.passDx = dx / d; p.passDz = dz / d; p.released = false; p.armed = false; p.drib = false;
  p.face = Math.atan2(dz, dx) - (p.lefty ? -0.5 : 0.5); p.faceOn = true; return true;
}
function releasePass(p) {
  const b = S.ball, q = S.P[p.passTo], h = ballHand(p);
  p.released = true; if (b.state !== B_HELD || b.holder !== p.id) return;
  b.x = h[0]; b.y = h[1]; b.z = h[2]; b.kf = false;
  if (p.kf && q.y <= 0.02 && q.act === A_NONE) { // kung-fu : le receveur saute dans la zone, reçoit en l'air et tire avant de retomber
    p.kf = false; const dir = S.dir[q.team], jx = dir * (HALF_L - 3.8), jz = (q.z < 0 ? -1 : 1) * 2.6, jd = hyp(jx - q.x, jz - q.z) || 1, tf = 0.45;
    q.vx = (jx - q.x) / jd * 5; q.vz = (jz - q.z) / jd * 5; q.vy = 3.9; q.y = 0.021; q.faceOn = true; q.face = Math.atan2(-q.z, dir * HALF_L - q.x);
    const kx = q.x + q.vx * tf, kz = q.z + q.vz * tf, ky = 3.9 * tf - 0.5 * G * tf * tf + 1.5 * q.h;
    b.vx = (kx - b.x) / tf; b.vz = (kz - b.z) / tf; b.vy = (ky - b.y + 0.5 * G * tf * tf) / tf; b.tx = kx; b.tz = kz; b.kf = true;
    b.state = B_FLY; b.kind = K_PASS; b.holder = -1; b.target = q.id; b.lastTeam = p.team; b.lastP = p.id; b.fly = 0; b.seen = 0; b.bounces = 0; b.curve = false; b.spin = 0;
    q.recv = 1; S.setPiece = false; evt('passe-kung-fu', p.team, q.id); return;
  }
  p.kf = false;
  let d = hyp(q.x - b.x, q.z - b.z); const v = d > 14 ? 21 : d > 7 ? 18 : 15; let t = d / v;
  let lx = q.vx * t * 0.85, lz = q.vz * t * 0.85; { const dT = hyp(q.tx - q.x, q.tz - q.z), ll = hyp(lx, lz); if (ll > dT && ll > 1e-3) { lx *= dT / ll; lz *= dT / ll; } } // on ne devance pas le receveur au-delà de l'endroit où il s'arrête
  const tx = clamp(q.x + lx, -19.4, 19.4), tz = clamp(q.z + lz, -9.6, 9.6), ty = 1.42 * q.h + q.y * 0.5;
  d = hyp(tx - b.x, tz - b.z); t = max(0.08, d / v);
  b.vx = (tx - b.x) / t; b.vz = (tz - b.z) / t; b.vy = (ty - b.y + 0.5 * G * t * t) / t; b.tx = tx; b.tz = tz;
  b.state = B_FLY; b.kind = K_PASS; b.holder = -1; b.target = q.id; b.lastTeam = p.team; b.lastP = p.id; b.fly = 0; b.seen = 0; b.bounces = 0; b.curve = false; b.spin = 0;
  { const tm = S.tm[p.team], ci = CH_IDX[p.role], cj = CH_IDX[q.role]; if (tm.st === PLACED && !tm.combo && ci >= 0 && cj >= 0 && abs(ci - cj) > 1) evt('passe-longue', p.team, q.id); }
  q.recv = 1; S.setPiece = false; evt('passe', p.team, q.id);
}

// ---------- ballon
function hitSphere(b, x, y, z, r, e) {
  const dx = b.x - x, dy = b.y - y, dz = b.z - z, d = hyp(dx, dy, dz), R = r + BALL_R; if (d >= R || d < 1e-4) return false;
  const nx = dx / d, ny = dy / d, nz = dz / d, vn = b.vx * nx + b.vy * ny + b.vz * nz;
  b.x = x + nx * R; b.y = y + ny * R; b.z = z + nz * R;
  if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; b.vz -= (1 + e) * vn * nz; b.vx *= 0.55; b.vy *= 0.55; b.vz *= 0.55; }
  return true;
}
const BODY = [[HAL, 0.165], [HAR, 0.165], [ELL, 0.1], [ELR, 0.1], [CHE, 0.21], [PEL, 0.2], [HEAD, 0.14], [KNL, 0.11], [KNR, 0.11], [ANL, 0.125], [ANR, 0.125]];
const MID = [[CHE, PEL, 0.2], [HAL, ELL, 0.09], [HAR, ELR, 0.09], [KNL, ANL, 0.1], [KNR, ANR, 0.1], [HIL, KNL, 0.13], [HIR, KNR, 0.13]];
function hitBody(b, o) {
  const J = o.J;
  for (let i = 0; i < BODY.length; i++) { const j = BODY[i][0] * 3; if (hitSphere(b, J[j], J[j + 1], J[j + 2], BODY[i][1], 0.22)) return true; }
  for (let i = 0; i < MID.length; i++) { const a = MID[i][0] * 3, c = MID[i][1] * 3; if (hitSphere(b, (J[a] + J[c]) / 2, (J[a + 1] + J[c + 1]) / 2, (J[a + 2] + J[c + 2]) / 2, MID[i][2], 0.22)) return true; }
  return false;
}
function goal(side) {
  REC.goal = 0; /* repère du but dans l'enregistrement */
  const team = S.dir[0] === side ? 0 : 1, b = S.ball;
  S.score[team]++; S.cheer = 1; S.saveT = 0; say('BUT !', 2.6); evt('but', team, b.shooter);
  b.state = B_NET; b.kind = K_NONE; S.netT = S.t; S.netY = b.y; S.netZ = b.z; S.netS = side;
  startRestart('eng', 1 - team, 0, 0); S.rs.wait = 4.2; if (!S.train) say('BUT !', 2.6);
}
function ballOut(goalLine, side) {
  const b = S.ball; let type, team;
  if (!goalLine) { type = 'touche'; team = 1 - b.lastTeam; say('Remise en jeu'); startRestart(type, team, b.x, b.z); return; }
  const defTeam = S.dir[0] === -side ? 0 : 1, last = S.P[b.lastP];
  if (b.lastTeam === defTeam && last && last.role !== GB) { say('Remise en jeu'); startRestart('touche', 1 - defTeam, side * 19.6, b.z); }
  else { say('Renvoi'); startRestart('renvoi', defTeam, b.x, b.z); }
}
function ballStep(live) {
  const b = S.ball;
  if (b.state === B_HELD) {
    const p = S.P[b.holder], h = ballHand(p);
    if (p.drib) { const c = abs(cos(p.holdT * TAU * DRIB_HZ / 2)); { const k2 = 1 - c; b.x = h[0] + (p.vx * 0.075 + cos(p.yaw) * 0.2) * k2; b.z = h[2] + (p.vz * 0.075 + sin(p.yaw) * 0.2) * k2; } /* même à l'arrêt, le ballon touche le sol devant le pied et non dessus */ b.y = BALL_R + (h[1] - 0.1 - BALL_R) * c; /* le ballon rebondit devant le joueur, à l'extérieur du pied, et remonte sous la main */ /* sommet du rebond sous la main, à hauteur de taille */ b.rot += 0.18; }
    else { b.x = h[0]; b.y = h[1]; b.z = h[2]; }
    return;
  }
  const sp = hyp(b.vx, b.vy, b.vz), n = sp > 9 ? 3 : 1, dt = DT / n; b.fly += DT; b.rot += (sp * 0.08 + abs(b.spin) * 0.004); if (b.hitCd > 0) b.hitCd -= DT;
  for (let k = 0; k < n; k++) {
    const px = b.x;
    b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < BALL_R) {
      b.y = BALL_R; b.bounces++;
      if (b.vy < -0.8) { b.vy = -b.vy * 0.72; if (b.curve) { b.curve = false; const d = hyp(b.cx - b.x, b.cz - b.z) || 1, s = max(5.5, hyp(b.vx, b.vz) * 0.95); b.vx = (b.cx - b.x) / d * s; b.vz = (b.cz - b.z) / d * s; b.vy = max(b.vy, 2.6); } else { b.vx *= 0.86; b.vz *= 0.86; } }
      else { b.vy = 0; const f = Math.exp(-dt * 1.4); b.vx *= f; b.vz *= f; }
    }
    if (b.state === B_NET) { // prisonnier du filet : fond incliné, côtés, dessus, et pas de retour vers le terrain
      const f = Math.exp(-dt * 9), sx = S.netS, xb = 20.86 - 0.11 * min(b.y, 2) - BALL_R; b.vx *= f; b.vz *= f;
      if (sx * b.x > xb) { b.x = sx * xb; b.vx = 0; } if (sx * b.x < HALF_L + 0.12) { b.x = sx * (HALF_L + 0.12); b.vx = 0; }
      b.z = clamp(b.z, -1.42, 1.42); if (b.y > 1.9) { b.y = 1.9; if (b.vy > 0) b.vy = -b.vy * 0.2; } continue; }
    if (!live) { b.x = clamp(b.x, -23, 23); b.z = clamp(b.z, -12, 12); continue; }
    // corps : gardien et défenseurs sur un tir, tout joueur adverse proche sinon
    if (b.kind === K_SHOT && b.hitCd <= 0) {
      const dt2 = 1 - S.P[b.shooter].team;
      for (let r = 0; r < 7; r++) {
        const o = S.P[dt2 * 7 + r]; if (o.off || abs(o.x - b.x) > 2.2 || abs(o.z - b.z) > 2.2) continue;
        if (r !== GB && b.fly < 0.12 && (o.x - b.x) * b.vx + (o.z - b.z) * b.vz < 0.25 * hyp(b.vx, b.vz)) continue; // un défenseur dans le dos du tireur ne contre pas
        if (r !== GB && b.shotType === SH_PLONG && b.fly < 0.2) continue; // le pivot lâche le ballon au-delà de la ligne des défenseurs
        if (hitBody(b, o)) {
          b.hitCd = 0.2; b.lastTeam = o.team; b.lastP = o.id; b.kind = K_NONE; b.state = B_LOOSE; b.looseT = 0; b.curve = false;
          if (o.role === GB) { evt('arret', o.team, o.id); S.saveT = 0.5; } else { evt('contre', o.team, o.id); say('Contre !', 1.4); }
          break;
        }
      }
    }
    // ligne de but
    const side = b.x > 0 ? 1 : -1;
    if (abs(px) <= HALF_L && abs(b.x) > HALF_L) {
      const f = (HALF_L - abs(px)) / max(1e-6, abs(b.x) - abs(px)), yc = b.y - b.vy * dt * (1 - f), zc = b.z - b.vz * dt * (1 - f);
      if (abs(zc) < GOAL_W / 2 - 0.02 && yc < GOAL_H - 0.02) { goal(side); return; }
      if (abs(zc) < GOAL_W / 2 + POST + BALL_R && yc < GOAL_H + POST + BALL_R) { b.x = side * (HALF_L - 0.02); b.vx = -b.vx * 0.5; b.vz += (abs(zc) > GOAL_W / 2 - 0.05 ? (zc > 0 ? 1 : -1) : 0) * 3; b.vy += yc > GOAL_H - 0.05 ? 2 : 0; b.kind = K_NONE; b.state = B_LOOSE; b.looseT = 0; evt('poteau', b.lastTeam); say('Poteau !', 1.4); continue; }
      ballOut(true, side); return;
    }
    if (abs(b.z) > HALF_W + BALL_R) { ballOut(false, 0); return; }
  }
  if (!live || b.state === B_NET) return;
  // réception, interception, ramassage
  if (b.kind === K_PASS) {
    const q = S.P[b.target];
    if (q && !q.off) {
      const cy = q.y + 1.36 * q.h, d = hyp(b.x - q.x, b.y - cy, b.z - q.z);
      if (d < (b.kf ? 0.8 : 0.66)) { const kf = b.kf; b.kf = false; give(q); evt('reception', q.team, q.id); if (kf && q.y > 0.1) { chooseAim(q, SH_SUSP); startShot(q, SH_KUNGFU, _aim[1], _aim[2], 0.9); return; } S.tm[q.team].passes++; if (S.pas.warn) { S.pas.passes++; if (S.pas.passes >= 5) { evt('jeu-passif', q.team); freeThrow(1 - q.team, q.x, q.z, 'Jeu passif'); } } return; }
    }
    const ot = 1 - b.lastTeam;
    for (let r = 0; r < 7; r++) {
      const o = S.P[ot * 7 + r]; if (o.off || (b.seen >> o.id) & 1) continue;
      const d = hyp(b.x - o.x, b.z - o.z); if (d > 0.62 || b.y > o.y + 2.25 * o.h || b.fly < 0.1) continue;
      if (r === GB && zoneDist(HALF_L + S.dir[ot] * o.x, o.z) > R6) continue;
      b.seen |= 1 << o.id;
      if (rnd() < (o.ctrl ? 0.8 : 0.42)) { give(o); evt('interception', o.team, o.id); say('Interception !', 1.4); return; }
      b.vx *= 0.35; b.vz *= 0.35; b.kind = K_NONE; b.state = B_LOOSE; b.looseT = 0; b.lastTeam = o.team; b.lastP = o.id; return;
    }
    if (b.fly > 2.2 || b.bounces > 1) { b.kind = K_NONE; b.state = B_LOOSE; b.looseT = 0; if (q) q.recv = 0; }
  } else if (b.state === B_FLY && b.kind === K_SHOT && (b.fly > 2.5 || (b.bounces > 2 && sp < 4))) { b.kind = K_NONE; b.state = B_LOOSE; b.looseT = 0; }
  if (b.state === B_LOOSE) {
    b.looseT += DT;
    for (let i = 0; i < 14; i++) {
      const p = S.P[i]; if (p.off || p.act === A_SAVE && p.at < p.svD + 0.25) continue;
      const own = zoneDist(HALF_L + S.dir[p.team] * b.x, b.z) < R6, opp = zoneDist(HALF_L - S.dir[p.team] * b.x, b.z) < R6;
      if (p.role === GB ? !own : (own || opp)) continue;
      if (hyp(p.x - b.x, p.z - b.z) < 0.75 && b.y < p.y + 1.9 && (b.looseT > 0.22 || sp < 7)) { give(p); evt('ramasse', p.team, p.id); return; }
    }
    if (b.looseT > 7) { const t = 1 - b.lastTeam; freeThrow(t, b.x, b.z, 'Ballon immobilisé'); }
  }
}

// ---------- déplacements
function moveP(p) {
  if (p.y > 0.02 || p.vy > 0) { // en l'air : trajectoire balistique
    p.vy -= G * DT; p.y += p.vy * DT; p.x += p.vx * DT; p.z += p.vz * DT;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.landed = true; const f = p.act === A_SHOOT && p.shot === SH_PLONG ? 0.8 : 0.55; p.vx *= f; p.vz *= f; }
  } else {
    let dx = p.tx - p.x, dz = p.tz - p.z; const d = hyp(dx, dz);
    let vm = p.tsp > 0 ? min(p.tsp, p.vmax) : p.vmax;
    if (p.contact > 0) vm *= 0.32; if (p.drib) vm = min(vm, p.vmax * 0.9);
    if (p.act === A_SHOOT && (SHOTS[p.shot].jump === 0 || p.shot === SH_PLONG) || p.act === A_PASS && S.setPiece) vm = p.shot === SH_7M ? 0 : 0.6;
    let des = d > 0.06 ? min(vm, d * 5.5) : 0;
    if (d > 0.06 && des > 2) { const a = abs(angDiff(p.yaw, Math.atan2(dz, dx))); if (a > 1.25) des *= a > 2.4 ? 0.62 : 0.76; }
    const tvx = d > 0.06 ? dx / d * des : 0, tvz = d > 0.06 ? dz / d * des : 0, ax = tvx - p.vx, az = tvz - p.vz, al = hyp(ax, az), am = (des < hyp(p.vx, p.vz) ? p.acc + 7 : p.acc) * DT;
    if (al <= am) { p.vx = tvx; p.vz = tvz; } else { p.vx += ax / al * am; p.vz += az / al * am; }
    p.x += p.vx * DT; p.z += p.vz * DT;
  }
  const sp = hyp(p.vx, p.vz), ty = p.faceOn ? p.face : (sp > 0.7 ? Math.atan2(p.vz, p.vx) : p.yaw), dy = angDiff(p.yaw, ty), m = (p.act ? 10 : 7.5) * DT;
  p.yaw += clamp(dy, -m, m);
  if (p.contact > 0) p.contact -= DT; if (p.foulCd > 0) p.foulCd -= DT; if (p.sigT > 0) { p.sigT -= DT; if (p.sigT <= 0) p.sig = 0; }
  p.x = clamp(p.x, -22.5, 22.5); p.z = clamp(p.z, -12.5, 12.5);
  // actions
  if (p.act) {
    p.at += DT;
    if (p.act === A_SHOOT) { if (!p.released && p.at >= SHOTS[p.shot].rel * p.ad) releaseShot(p); if (p.at >= p.ad && p.y <= 0.02) { p.act = A_NONE; p.faceOn = false; } }
    else if (p.act === A_PASS) { if (!p.released && p.at >= 0.6 * p.ad) releasePass(p); if (p.at >= p.ad) { p.act = A_NONE; p.faceOn = false; } }
    else if (p.act === A_SAVE) { if (p.at >= p.ad) { p.act = A_NONE; p.svOn = false; } }
    else if (p.at >= p.ad && p.y <= 0.02) p.act = A_NONE;
  }
}
// Tirs où le tireur saute dans la zone, au-delà des défenseurs : il garde son élan. Sur un tir de loin, le tireur qui touche le contreur est arrêté net et retombe devant lui.
const FREE_JUMP = [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1];
function separate() {
  for (let i = 0; i < 16; i++) S.P[i].touch = -1;
  for (let it = 0; it < 5; it++) for (let i = 0; i < 16; i++) { const a = S.P[i]; if (a.off) continue; for (let j = i + 1; j < 16; j++) { const c = S.P[j]; if (c.off) continue; const dx = c.x - a.x, dz = c.z - a.z, d2 = dx * dx + dz * dz, R = a.team === c.team ? 0.72 : 0.92; /* adversaires : épaule contre torse, sans s'encastrer */
    if (it === 0 && a.team !== c.team && d2 < 1.3 && !a.ref && !c.ref) { if (a.touch < 0) a.touch = j; if (c.touch < 0) c.touch = i; } if (d2 < R * R && d2 > 1e-6 && abs(a.y - c.y) < 1.2) { const d = sqrt(d2), k = (R - d) / d * 0.5, sa = a.act === A_SHOOT && a.y > 0.02, sc = c.act === A_SHOOT && c.y > 0.02, fa = sa && FREE_JUMP[a.shot] ? 0 : sc && FREE_JUMP[c.shot] ? 2 : 1; if (sa && !FREE_JUMP[a.shot]) { a.vx = 0; a.vz = 0; } if (sc && !FREE_JUMP[c.shot]) { c.vx = 0; c.vz = 0; } a.x -= dx * k * fa; a.z -= dz * k * fa; c.x += dx * k * (2 - fa); c.z += dz * k * (2 - fa); } } } // le tireur en l'air est freiné par le contreur : il retombe devant lui
  for (let i = 0; i < 16; i++) {
    const a = S.P[i]; if (a.off) continue;
    for (let j = i + 1; j < 0; j++) {
      const c = S.P[j]; if (c.off) continue; const dx = c.x - a.x, dz = c.z - a.z, d2 = dx * dx + dz * dz, R = 0.62;
      if (d2 < R * R && d2 > 1e-6 && abs(a.y - c.y) < 1.2) { const d = sqrt(d2), k = (R - d) / d * 0.5; a.x -= dx * k; a.z -= dz * k; c.x += dx * k; c.z += dz * k; }
    }
    // les joueurs de champ n'entrent pas au sol dans les surfaces de but (sauf joueur dirigé : la faute est sifflée)
    if ((a.role !== GB || a.ref) && a.y <= 0.02 && !a.ctrl) {
      for (let s = -1; s <= 1; s += 2) {
        const u = HALF_L - s * a.x, w = a.z, zd = zoneDist(u, w);
        if (u > -0.05 && zd < R6 + 0.12) { const cz = clamp(w, -1.5, 1.5), ex = u, ez = w - cz, l = hyp(ex, ez) || 1, k = min(0.09, R6 + 0.12 - zd), nx = -s * ex / l, nz = ez / l, vn = a.vx * nx + a.vz * nz; a.x += nx * k; a.z += nz * k; if (vn < 0) { a.vx -= nx * vn; a.vz -= nz * vn; } }
      }
    } else if (a.role === GB && !a.ref && S.phase === 'play') { const s = -S.dir[a.team], u = HALF_L - s * a.x; if (zoneDist(u, a.z) > R6 - 0.3 && a.y <= 0.02) { a.tx = s * 19; a.tz = 0; } }
  }
}

// ---------- règles (jeu en cours)
function rules() {
  const b = S.ball, h = holder();
  if (h) {
    if (!h.drib || S.setPiece) h.holdT += DT; else h.holdT += DT;
    const n = h.ff - h.ffSeen; h.ffSeen = h.ff;
    if (n > 0 && !h.drib && h.act !== A_SHOOT) { for (let i = 0; i < n; i++) { if (h.zeroStep) h.zeroStep = false; else h.steps++; } if (h.steps > 3) { say('Marcher'); violation(h, 'marcher', 'Marcher'); return; } }
    if (!h.drib && h.holdT > 3.0 && h.act === A_NONE) { violation(h, '3-secondes', '3 secondes'); return; }
    if (h.role !== GB && h.y <= 0.02 && !h.landed) {
      const dir = S.dir[h.team];
      if (zoneDist(uOf(h.x, dir), h.z) < R6 - 0.06) { evt('zone', h.team, h.id); say('Zone — renvoi'); startRestart('renvoi', 1 - h.team, h.x, h.z); return; }
      if (zoneDist(HALF_L + dir * h.x, h.z) < R6 - 0.06) { violation(h, 'zone-propre', 'Zone'); return; }
    }
    if (h.y > 0.02) h.landed = false;
    // contacts défensifs
    if (h.role !== GB && !S.setPiece) {
      const dir = S.dir[h.team], gx = dir * HALF_L - h.x, gz = -h.z, gl = hyp(gx, gz) || 1;
      for (let r = 1; r < 7; r++) {
        const o = S.P[(1 - h.team) * 7 + r]; if (o.off) continue;
        const rx = o.x - h.x, rz = o.z - h.z, d = hyp(rx, rz); if (d > 0.95) continue;
        const press = o.ctrl ? S.inp.tackle : o.ai.mode === 1; if (!press) continue;
        const front = (rx * gx + rz * gz) / (d * gl + 1e-6) > 0.2, zd = zoneDist(uOf(h.x, dir), dir * h.z);
        h.contact = 0.25;
        if (h.act === A_SHOOT && h.y > 0.05) { if (!front && o.foulCd <= 0 && (o.ctrl || rnd() < 0.05)) { o.foulCd = 1.7; evt('faute-tireur', o.team, o.id); const s = sanction(o, 2); say('Jet de 7 m — ' + s, 2.6); startRestart('7m', h.team, 0, 0); return; } continue; }
        if (o.foulCd > 0 || S.train) continue; o.foulCd = 1.7; // pas de faute sifflée à l'entraînement
        if (rnd() < (front ? 0.15 : 0.4)) {
          if (front && (h.act === A_SHOOT || zd < 8.4 && hyp(h.vx, h.vz) > 3.2)) { evt('avantage', h.team, h.id); say('Avantage', 1.1); h.contact = 0; continue; } /* règle 13.2 : pas d'interruption si l'attaque garde son avantage */
          evt('faute', o.team, o.id);
          if (!front && zd < 8.6) { const s = sanction(o, 1); say('Jet de 7 m' + (s ? ' — ' + s : ''), 2.6); startRestart('7m', h.team, 0, 0); return; }
          const s = rnd() < 0.2 ? sanction(o, 1) : ''; freeThrow(h.team, h.x, h.z, 'Faute' + (s ? ' (' + s + ')' : '')); return;
        }
        if (h.drib && front && rnd() < 0.25) { b.state = B_LOOSE; b.holder = -1; b.kind = K_NONE; b.looseT = 0; b.vx = (rx / d) * 3; b.vz = (rz / d) * 3; b.vy = 1; b.lastTeam = o.team; b.lastP = o.id; h.drib = false; evt('ballon-vole', o.team, o.id); return; }
      }
    }
  }
  // défenseur dirigé qui défend dans sa surface de but
  for (let i = 0; i < 14; i++) {
    const p = S.P[i]; if (!p.ctrl || p.role === GB || p.team === S.poss) continue;
    if (zoneDist(HALF_L + S.dir[p.team] * p.x, p.z) < R6 - 0.3 && p.y <= 0.02) { p.inZoneT += DT; if (p.inZoneT > 0.5 && h && hyp(h.x - p.x, h.z - p.z) < 3.5) { p.inZoneT = 0; evt('defense-en-zone', p.team, p.id); say('Défense en zone — jet de 7 m', 2.6); startRestart('7m', 1 - p.team, 0, 0); return; } } else p.inZoneT = 0;
  }
  // jeu passif : geste d'avertissement, puis quatre passes au plus
  if (b.state !== B_NET) {
    S.pas.t += DT;
    if (!S.pas.warn && S.pas.t > 26) { S.pas.warn = true; S.pas.passes = 0; evt('avertissement-passif', S.poss); S.P[14].sig = 1; S.P[14].sigT = 4; }
  }
}

// ---------- pas de simulation
function simStep() {
  S.t += DT; const b = S.ball;
  if (S.saveT > 0) { S.saveT -= DT; if (S.saveT <= 0 && b.state !== B_NET && S.phase === 'play') { say('Arrêt du gardien !', 1.6); S.cheer = 0.5; } }
  if (S.msgT > 0) S.msgT -= DT; if (S.cheer > 0) S.cheer = max(0, S.cheer - DT * 0.25);
  if (S.phase === 'play' && !S.train) {
    S.clock += DT;
    for (let i = 0; i < 14; i++) { const p = S.P[i]; if (p.susp > 0) { p.susp -= DT; if (p.susp <= 0) { p.susp = 0; p.off = false; if (p.disq) { p.disq = false; p.twoMin = 0; p.num += 30; } evt('retour', p.team, p.id); } } }
    if (S.clock >= S.halfLen * (S.half + 1) && b.kind !== K_SHOT) {
      if (S.half === 0) { S.half = 1; S.tmoHalf[0] = S.tmoHalf[1] = 0; S.dir[0] = -1; S.dir[1] = 1; say('Mi-temps', 3); evt('mi-temps', -1); placeTeams(); S.poss = 0; startRestart('eng', 1, 0, 0); }
      else { S.phase = 'end'; say('Fin du match', 5); evt('fin', -1); return; }
    }
  }
  if (S.phase === 'dead') {
    const r = S.rs; r.t += DT; aiDead();
    if (r.t >= r.wait) {
      const e = S.P[r.exec]; let ex = r.x, ez = r.z; if (r.type === 'renvoi') { ex = e.x; ez = e.z; }
      if (hyp(e.x - ex, e.z - ez) > 1.0) { e.x = ex; e.z = ez; e.vx = e.vz = 0; }
      e.y = 0; e.vy = 0; e.act = A_NONE; S.poss = -1; give(e); e.zeroStep = false; S.phase = 'play'; S.setPiece = true; S.tm[e.team].st = uOf(e.x, S.dir[e.team]) < 16 ? PLACED : TRANS;
      evt('sifflet', e.team, r.type);
    }
  } else if (S.phase === 'play') { aiPlay(); }
  aiRefs();
  for (let i = 0; i < 16; i++) { const p = S.P[i]; if (p.off) benchP(p); moveP(p); }
  separate();
  ballStep(S.phase === 'play');
  if (S.phase === 'play') rules();
  for (let i = 0; i < 16; i++) { const p = S.P[i]; poseP(p, DT, b, b.state === B_HELD && b.holder === i); }
  if (b.state === B_HELD) ballStep(false);
  recFrame();
  if (S.train && S.train.reset > 0) { S.train.reset -= DT; if (S.train.reset <= 0) setupTrain(); }
}
function benchP(p) { const d = S.dir[p.team]; p.tx = -d * (3.5 + p.role * 0.9); p.tz = -10.6; p.tsp = 4; p.faceOn = true; p.face = PI / 2; p.stance = 0; }
