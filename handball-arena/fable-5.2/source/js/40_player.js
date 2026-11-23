// Joueurs : squelette résolu en positions (cinématique inverse), animation procédurale.
// Articulations (3 flottants chacune) dans p.J.
const PEL = 0, CHE = 1, HEAD = 2, SHL = 3, ELL = 4, HAL = 5, SHR = 6, ELR = 7, HAR = 8, HIL = 9, KNL = 10, ANL = 11, TOL = 12, HIR = 13, KNR = 14, ANR = 15, TOR = 16, NECK = 17, NJ = 18;
// Actions.
const DRIB_HZ = 1.8; // rebonds par seconde
const A_NONE = 0, A_SHOOT = 1, A_PASS = 2, A_BLOCK = 3, A_SAVE = 4, A_FEINT = 5;
// Gestes de tir. W : armé, R : lâcher, F : fin de geste (repère local : x vers l'avant, y hauteur, z côté du bras tireur).
// rel : instant du lâcher (fraction de dur), jump : impulsion verticale, v : vitesse du ballon (m/s).
const SHOTS = [
  { k: 'appui', n: 'Tir en appui', dur: 0.52, rel: 0.62, jump: 0, v: 25, W: [-0.52, 1.50, 0.38], R: [0.58, 1.84, 0.34], F: [0.55, 1.10, -0.25], pitch: 0.34, roll: 0, lunge: 1 },
  { k: 'suspension', n: 'Tir en suspension', dur: 0.66, rel: 0.60, jump: 3.5, v: 26, W: [-0.50, 1.52, 0.38], R: [0.56, 1.88, 0.36], F: [0.55, 1.20, -0.25], pitch: 0.26, roll: 0 },
  { k: 'hanche', n: 'Tir à la hanche', dur: 0.50, rel: 0.64, jump: 0, v: 23, W: [-0.40, 1.62, 0.42], R: [0.42, 0.98, 0.74], F: [0.45, 1.00, -0.35], pitch: 0.3, roll: 0.55, lunge: 1, fake: 0.4 },
  { k: 'desaxe', n: 'Tir désaxé', dur: 0.66, rel: 0.62, jump: 3.3, v: 23, W: [-0.44, 1.52, 0.34], R: [0.22, 1.80, -0.95], F: [0.40, 1.25, -0.85], pitch: 0.05, roll: -1.15 },
  { k: 'ailier', n: "Tir d'ailier", dur: 0.74, rel: 0.70, jump: 3.8, v: 22, W: [-0.40, 1.64, 0.44], R: [0.50, 1.88, 0.46], F: [0.50, 1.25, -0.20], pitch: 0.25, roll: -0.6 },
  { k: 'plongeant', n: 'Tir en plongeant', dur: 0.95, rel: 0.33, jump: 2.3, v: 21, W: [-0.20, 1.30, 0.42], R: [0.75, 1.05, 0.30], F: [0.80, 0.22, 0.12], pitch: 1.15, roll: 0 },
  { k: 'lob', n: 'Lob', dur: 0.70, rel: 0.64, jump: 3.4, v: 0, W: [-0.40, 1.62, 0.42], R: [0.42, 2.00, 0.30], F: [0.44, 1.85, 0.20], pitch: 0.12, roll: 0, fake: 0.5 },
  { k: 'chabala', n: 'Chabala', dur: 0.86, rel: 0.62, jump: 3.9, v: 0, W: [-0.46, 1.58, 0.40], R: [0.56, 1.52, 0.36], F: [0.5, 1.78, 0.3], pitch: 0.42, roll: 0, fake: 0.4, whip: 1 },
  { k: 'roucoulette', n: 'Roucoulette', dur: 0.80, rel: 0.66, jump: 3.6, v: 8.5, W: [-0.36, 1.72, 0.42], R: [0.42, 0.86, 0.86], F: [0.30, 0.80, 0.30], pitch: 0.38, roll: 0.6, fake: 0.45, whip: 1 },
  { k: '7m', n: 'Jet de 7 m', dur: 0.56, rel: 0.62, jump: 0, v: 25, W: [-0.42, 1.60, 0.42], R: [0.58, 1.84, 0.34], F: [0.55, 1.10, -0.25], pitch: 0.24, roll: 0, lunge: 1 },
  { k: 'kungfu', n: 'Kung-fu', dur: 0.30, rel: 0.55, jump: 0, v: 23, W: [0.05, 1.95, 0.36], R: [0.52, 1.92, 0.36], F: [0.50, 1.30, -0.20], pitch: 0.2, roll: 0 },
];
const SH_APPUI = 0, SH_SUSP = 1, SH_HANCHE = 2, SH_DESAXE = 3, SH_AILIER = 4, SH_PLONG = 5, SH_LOB = 6, SH_CHABALA = 7, SH_ROUC = 8, SH_7M = 9, SH_KUNGFU = 10;

function mkPlayer(id, team, role, num, lefty, h, build, skin, hair) {
  return {
    id, team, role, num, lefty, h, build, skin, hair, ref: team < 0,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, tx: 0, tz: 0, tsp: 0, face: 0, faceOn: false,
    vmax: role === GB ? 5.4 : role === PVT ? 6.1 : (role === ALG || role === ALD) ? 7.9 : 7.0, acc: role === PVT ? 12.5 : (role === ALG || role === ALD) ? 21 : 15,
    act: A_NONE, at: 0, ad: 0, shot: 0, released: false, aimX: 0, aimY: 0, aimZ: 0, power: 1, passTo: -1, passDx: 0, passDz: 0,
    kf: false, drib: false, dribbled: false, steps: 0, ff: 0, ffSeen: 0, zeroStep: false, holdT: 0, armed: false, contact: 0, foulCd: 0,
    stance: 0, recv: 0, sig: 0, sigT: 0, gS: 0, rS: 0, touch: -1, idle: hash1(id * 3.7) * 9,
    svx: 0, svy: 0, svz: 0, svT: 0, svD: 0, svR: 0, svOn: false, bit: false,
    susp: 0, yellow: false, twoMin: 0, off: false, disq: false, ctrl: false, inZoneT: 0, landed: false,
    ph: hash1(id * 7.3), wide: 0.13, crouch: 0.03, pitch: 0, roll: 0, twist: 0,
    J: new Float32Array(NJ * 3), hc: new Float32Array([0.1, 0.9, -0.26, 0.1, 0.9, 0.26]),
    ai: { tx: 0, tz: 0, t: 0, mode: 0, cd: 0, gap: 0, seen: 0, bk: 1 },
  };
}

// Angle de l'avant-bras sur l'horizontale pendant le dribble. u = phase du rebond, 0 au sommet (ballon dans la main).
function dribAngle(holdT) { let u = holdT * DRIB_HZ; u -= Math.floor(u); const hi = -10 * PI / 180, lo = -58 * PI / 180; /* mesuré sur le squelette : environ +5° à -40° */ return u < 0.2 ? lerp(hi, lo, smooth(u / 0.2)) : lerp(lo, hi, smooth((u - 0.2) / 0.8)); }
const _ht = new Float32Array(6), _pp = new Float32Array(3);
// Repousse le point _pp hors du tronc (section elliptique entre le bassin et les épaules). Renvoie vrai s'il a bougé.
function torsoPush(J, s, b, rtx, rtz, ftx, ftz, margin) {
  const ax = J[0], ay = J[1] - 0.14 * s, az = J[2], bx = J[3] - ax, by = J[4] + 0.04 * s - ay, bz = J[5] - az, l2 = bx * bx + by * by + bz * bz;
  let t = ((_pp[0] - ax) * bx + (_pp[1] - ay) * by + (_pp[2] - az) * bz) / l2; if (t < -0.04 || t > 1.06) return false; t = clamp(t, 0, 1);
  const dx = _pp[0] - (ax + bx * t), dz = _pp[2] - (az + bz * t), dr = dx * rtx + dz * rtz, df = dx * ftx + dz * ftz, a = 0.185 * b * s + margin, c = 0.122 * s + margin, q = dr * dr / (a * a) + df * df / (c * c);
  if (q >= 1) return false; if (q < 1e-4) { _pp[0] += ftx * c; _pp[2] += ftz * c; return true; }
  const k = 1 / sqrt(q) - 1; _pp[0] += (dr * rtx + df * ftx) * k; _pp[2] += (dr * rtz + df * ftz) * k; return true;
}
function _setJ(J, i, x, y, z) { J[i * 3] = x; J[i * 3 + 1] = y; J[i * 3 + 2] = z; }

// Met à jour le squelette. Déterministe : fait partie de la simulation (point de lâcher, arrêts du gardien).
function poseP(p, dt, ball, holding) {
  const J = p.J, s = p.h, fx = cos(p.yaw), fz = sin(p.yaw), rx = -fz, rz = fx;
  const sp = hyp(p.vx, p.vz), vf = p.vx * fx + p.vz * fz, vr = p.vx * rx + p.vz * rz;
  const air = p.y > 0.02, sg = p.lefty ? -1 : 1, gk = p.role === GB && !p.ref;
  // --- cycle de course : le pied d'appui recule exactement à la vitesse du corps, donc ne glisse pas.
  // foulée : plus courte en pas chassés et à reculons, cadence propre à chaque joueur, jamais tout à fait régulière
  const fw0 = sp > 0.05 ? vf / sp : 1, sd0 = sp > 0.05 ? abs(vr) / sp : 0, dsc = (1 - 0.5 * sd0) * (fw0 < 0 ? 1 + 0.4 * fw0 : 1) * (0.95 + 0.1 * hash1(p.id * 4.7)), rnG = sat((sp - 1.6) / 2.2) * max(0, fw0);
  const cyc = (1.15 + 0.42 * min(sp, 8)) * s * dsc * (1 + 0.07 * sin(p.idle * 1.3 + p.id * 1.9) + 0.04 * sin(p.idle * 3.1 + p.id)), prev = p.ph;
  p.ph += sp * dt / cyc;
  if (p.ph >= 1) { p.ph -= 1; if (!air) p.ff++; }
  if (!air && prev < 0.5 && p.ph >= 0.5) p.ff++;
  const duty = clamp(0.62 - 0.09 * sp, 0.28, 0.62), S = duty * cyc, mv = sat(sp / 0.5), land = 0.5 - 0.1 * rnG; // sous 0,5 : phase de suspension ; en course le pied se pose près de l'aplomb du bassin
  const ux = sp > 0.05 ? vf / sp : 0, uz = sp > 0.05 ? vr / sp : 0;
  const k12 = 1 - Math.exp(-dt * 12), k7 = 1 - Math.exp(-dt * 7);
  const shooting = p.act === A_SHOOT, sh = SHOTS[p.shot], q = p.ad > 0 ? p.at / p.ad : 0;
  // cibles de posture
  p.idle += dt; const iw = sin(p.idle * 1.7 + p.id), iv = sin(p.idle * 2.3 + p.id * 2.1), still = 1 - mv;
  let wideT = 0.15 + 0.03 * still, crouchT = 0.012 + 0.03 * max(0, min(sp, 6) - 2) + 0.01 * still + 0.006 * still * iv, pitchT = 0.085 + 0.042 * min(sp, 6) * (vf >= 0 ? 1 : 0), rollT = -0.03 * clamp(vr, -4, 4) + 0.035 * still * iw, twistT = 0.06 * still * iv + 0.16 * mv * cos(p.ph * TAU) * (vf >= -0.3 ? 1 : 0.3);
  const guardT = max(p.stance > 0.5 ? sat((2.4 - max(0, vf)) / 0.8) : 0, 0.8 * sat(-vf / 1.2)), gmv = sat(sp / 2); p.gS += (guardT - p.gS) * (1 - Math.exp(-dt * 7)); const guard = p.gS; /* les changements de posture sont fondus sur environ 0,3 s */ // garde défensive en pas chassés et à reculons, pas en course vers l'avant
  if (guard > 0) { wideT = lerp(wideT, 0.26, guard); crouchT = lerp(crouchT, 0.24 - 0.05 * gmv, guard); pitchT = lerp(max(pitchT, 0.08), 0.32 - 0.04 * gmv, guard); }
  if (gk) { wideT = 0.3; crouchT = 0.14; pitchT = 0.16; }
  if (p.drib) pitchT = min(pitchT, 0.2);
  if (p.act === A_BLOCK) { crouchT = air ? 0 : 0.14; pitchT = 0.02; wideT = 0.16; }
  if (shooting) {
    const a = q < sh.rel ? smooth(q / sh.rel) : 1; pitchT = lerp(-0.12, sh.pitch, a) + (q > sh.rel ? 0.15 : 0); rollT = sh.roll * sg * a;
    twistT = sg * lerp(-0.75, 0.65, smooth((q - sh.rel * 0.55) / (sh.rel * 0.5)));
    if (!air && sh.jump > 0 && q < 0.1) crouchT = 0.16;
    if (sh.k === 'plongeant') { pitchT = lerp(0.5, 1.4, smooth(q / 0.2)); if (air) crouchT = 0.3; if (!air && q > 0.2) { crouchT = 0.78; pitchT = q > 0.8 ? lerp(1.4, 0.5, (q - 0.8) / 0.2) : 1.5; } } // réception au sol puis glissade
  }
  if (p.act === A_PASS) twistT = sg * lerp(-0.3, 0.4, q);
  if (p.act === A_FEINT) { rollT = 0.35 * sin(q * PI) * (p.passDz > 0 ? 1 : -1); crouchT = 0.14; }
  if (p.act === A_SAVE && p.svOn) {
    const dx = p.svx - p.x, dz = p.svz - p.z, lz = dx * rx + dz * rz, a = smooth((p.at - p.svR) / max(0.05, p.svD - p.svR));
    rollT = clamp(lz, -1.2, 1.2) * 0.55 * a * (p.svy > 0.95 ? 1 : 0.35); crouchT = p.svy < 0.7 ? 0.1 + (p.bit ? 0.36 : 0.16) * a : 0.04; pitchT = p.bit ? 0.3 : 0.1;
  }
  if (p.touch >= 0 && !shooting && p.y <= 0.02) pitchT = min(pitchT, 0.12); /* au contact, les bustes se redressent : les têtes ne se croisent pas */
  if (guard > 0.3) { const sw2 = sin(p.ph * TAU) * mv * guard; rollT += 0.07 * sw2; twistT += 0.1 * sw2; crouchT += 0.025 * abs(sw2); } /* pas chassés : le buste accompagne chaque appui */
  p.wide += (wideT - p.wide) * k7; p.crouch += (crouchT - p.crouch) * k12; p.pitch += (pitchT - p.pitch) * k12; p.roll += (rollT - p.roll) * (shooting ? 1 - Math.exp(-dt * 24) : k12);
  p.twist += (twistT - p.twist) * (shooting ? 1 - Math.exp(-dt * 30) : k12);
  // --- bassin et buste
  // hauteur du bassin : jambe d'appui presque tendue, le bassin descend juste assez pour que le pied le plus éloigné reste au sol
  let dmax = 0; for (let i = 0; i < 2; i++) { let ph2 = p.ph + (i ? 0.5 : 0); if (ph2 >= 1) ph2 -= 1; if (ph2 < duty) dmax = max(dmax, abs(land - ph2 / duty) * S * mv); }
  const hipBase = (1.055 - p.crouch) * s, hipReach = 0.075 * s + 0.02 + sqrt(max(0.2, 0.934 * 0.934 * s * s - dmax * dmax - 0.003)), hipY = max(hipBase - (0.08 - 0.055 * rnG) * s, min(hipBase, hipReach)) + p.y + 0.09 * s * rnG * max(0, cos(2 * TAU * (p.ph - (duty + 0.5) / 2)));
  const flt = 0.1 * s * rnG * max(0, cos(2 * TAU * (p.ph - (duty + 0.5) / 2))); // pendant la suspension, les deux pieds quittent le sol
  const cp = cos(p.pitch), spi = sin(p.pitch), sr = sin(p.roll);
  let ux3 = fx * spi + rx * sr, uy3 = cp, uz3 = fz * spi + rz * sr; { const l = 1 / hyp(ux3, uy3, uz3); ux3 *= l; uy3 *= l; uz3 *= l; }
  const bk = (0.045 + spi * 0.12) * s, px = p.x - fx * bk, pz = p.z - fz * bk; // bassin en arrière de l'aplomb des pieds, épaules au-dessus : posture d'athlète, pas « hanches en avant »
  _setJ(J, PEL, px, hipY, pz);
  const cx = px + ux3 * 0.53 * s, cy = hipY + uy3 * 0.53 * s, cz = pz + uz3 * 0.53 * s; _setJ(J, CHE, cx, cy, cz);
  _setJ(J, NECK, cx + ux3 * 0.09 * s, cy + uy3 * 0.09 * s, cz + uz3 * 0.09 * s);
  // tête : regarde le ballon
  let hx = fx, hz = fz; if (ball) { const bx = ball.x - p.x, bz = ball.z - p.z, bl = hyp(bx, bz); if (bl > 0.6) { let ux2 = bx / bl, uz2 = bz / bl; const dt2 = ux2 * fx + uz2 * fz; if (dt2 < 0.1) { const sd2 = ux2 * rx + uz2 * rz >= 0 ? 1 : -1; ux2 = fx * 0.1 + rx * sd2 * 0.995; uz2 = fz * 0.1 + rz * sd2 * 0.995; } hx = fx * 0.45 + ux2 * 0.55; hz = fz * 0.45 + uz2 * 0.55; } } // le cou ne tourne pas au-delà de l'épaule
  _setJ(J, HEAD, cx + ux3 * 0.2 * s + hx * 0.032, cy + uy3 * 0.2 * s, cz + uz3 * 0.2 * s + hz * 0.032);
  { const hl = hyp(hx, hz); if (hl < 0.25) { hx = fx; hz = fz; } else { hx /= hl; hz /= hl; } } // ballon dans le dos : la tête reste de face
  p.hdx = hx; p.hdz = hz;
  const ct = cos(p.twist), st = sin(p.twist), tx = rx * ct + fx * st, tz = rz * ct + fz * st, shw = 0.205 * s * p.build;
  const slx = cx - tx * shw - ux3 * 0.03, sly = cy - uy3 * 0.03 + sr * shw * 0.6, slz = cz - tz * shw - uz3 * 0.03;
  const srx = cx + tx * shw - ux3 * 0.03, sry = cy - uy3 * 0.03 - sr * shw * 0.6, srz = cz + tz * shw - uz3 * 0.03;
  _setJ(J, SHL, slx, sly, slz); _setJ(J, SHR, srx, sry, srz);
  // --- jambes
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1; let ph = p.ph + (i ? 0.5 : 0); if (ph >= 1) ph -= 1;
    let lx, lz, ly, lift = 0;
    if (ph < duty) { const k = land - ph / duty; lx = ux * S * k; lz = uz * S * k; ly = 0; }
    else { const sw = (ph - duty) / (1 - duty), k = land - 1 + smooth(sw); lx = ux * S * k; lz = uz * S * k; lift = Math.pow(sin(PI * sw), 0.6); const hk = sin(PI * min(1, sw * 1.55)); ly = lift * (0.04 + 0.02 * min(sp, 7)) + hk * hk * rnG * 0.36 + lift * sw * rnG * 0.09 + flt; lx -= hk * rnG * 0.12 * ux; lz -= hk * rnG * 0.12 * uz; }
    lx *= mv; ly = (ly + 0.1 * lift * guard) * mv; lz = lz * mv + side * p.wide * s * (1 - 0.78 * mv * (1 - guard) * max(0, fw0)); // en marche et en course, les pieds se posent presque sur une ligne
    if (guard > 0.5 || gk) lx += (1 - mv) * side * -0.06 * sg;
    if (shooting && sh.lunge) { const a2 = smooth(q / 0.35); lx = lerp(lx, side === sg ? -0.34 : 0.36, a2); lz = lerp(lz, side * 0.16 * s, a2); }
    if (air) {
      const a = sat(p.y / 0.22); let axl, ayl;
      if (p.act === A_BLOCK || gk) { axl = -0.03; ayl = 0.02; }
      else if (side === sg) { axl = lerp(0.34, -0.12, shooting ? smooth(q * 1.15) : 0); ayl = lerp(0.36, 0.12, shooting ? smooth(q * 1.15) : 0); } else { axl = lerp(-0.26, 0.16, shooting ? smooth(q * 1.15) : 0); ayl = 0.06; } // jambe libre du côté du bras, impulsion sur l'autre
      if (shooting && sh.k === 'plongeant') { axl = -0.82; ayl = 0.62 + (side === sg ? 0.06 : 0); } // corps allongé : les jambes suivent à l'horizontale
      lx = lerp(lx, axl, a); ly = lerp(ly, ayl, a); lift = a;
    }
    if (shooting && sh.k === 'plongeant' && !air && q > sh.rel) { lx = -0.9; ly = 0.02; lz = side * 0.14 * s; }
    if (p.act === A_SAVE && p.svOn && p.svy <= 0.95) { // parade basse : la jambe du côté du tir part vers le ballon
      const dx = p.svx - p.x, dz = p.svz - p.z, tlz = dx * rx + dz * rz, tlx = dx * fx + dz * fz;
      if ((tlz >= 0) === (side > 0)) { const a = smooth((p.at - p.svR) / max(0.05, p.svD - p.svR)); lx = lerp(lx, tlx, a); lz = lerp(lz, tlz, a); ly = lerp(ly, max(0, p.svy - 0.1), a); lift = a * 0.5; }
    }
    const hxw = px + rx * side * 0.1 * s, hzw = pz + rz * side * 0.1 * s, hyw = hipY - 0.02;
    const po = ph < duty && !air ? smooth((ph / duty - 0.45) / 0.55) * mv * max(0, fw0) * (0.075 + 0.07 * rnG) * s : 0; // le talon décolle à la poussée
    let ax = p.x + fx * lx + rx * lz, ay = 0.075 * s + ly + p.y + po, az = p.z + fz * lx + rz * lz;
    const hi = i ? HIR : HIL, kn = i ? KNR : KNL, an = i ? ANR : ANL, to = i ? TOR : TOL;
    _setJ(J, hi, hxw, hyw, hzw);
    const r = ik2(J, kn * 3, hxw, hyw, hzw, ax, ay, az, 0.47 * s, 0.47 * s, fx + rx * side * (0.04 + 0.21 * (1 - mv * (1 - guard))), 0.25, fz + rz * side * (0.04 + 0.21 * (1 - mv * (1 - guard))));
    if (r < 1) { ax = hxw + (ax - hxw) * r; ay = hyw + (ay - hyw) * r; az = hzw + (az - hzw) * r; }
    _setJ(J, an, ax, ay, az);
    // déroulé du pied : la pointe se relève à l'attaque du talon et plonge à la poussée
    let roll2 = 0; if (!air && mv > 0.3 && vf > 0.5) { if (ph < duty) { const k2 = ph / duty; roll2 = k2 < 0.25 ? 0.07 * (1 - k2 / 0.25) : k2 > 0.75 ? -0.02 : 0; } else { const q2 = (ph - duty) / (1 - duty); roll2 = q2 < 0.6 ? -0.11 * sin(PI * q2 / 0.6) : 0.07 * (q2 - 0.6) / 0.4; } } // pointe basse en début d'oscillation, relevée avant l'attaque du talon
    _setJ(J, to, ax + fx * 0.2 * s, max(0.03, ay - po - 0.045 * s + roll2 - (air ? lift * 0.07 : 0)), az + fz * 0.2 * s);
  }
  // --- mains : cibles locales (x avant, y hauteur pour une taille de 1, z droite)
  const T = _ht, sw = -cos(p.ph * TAU) * mv * min(1, 0.55 + sp / 5) * (vf >= -0.3 ? 1 : 0.4); let rate = 14;
  const cxl = (cx - p.x) * fx + (cz - p.z) * fz, cyl = (cy - p.y) / s; /* position de la poitrine dans le repère du joueur : les bras partent des épaules, pas du bassin */
  p.rS += (sat((sp - 1.6) / 1.2) - p.rS) * (1 - Math.exp(-dt * 6)); const br = 0, run = p.rS, amp = lerp(0.2, 0.26, run), hx0 = cxl + lerp(0.0, -0.05, run), hy = cyl - lerp(0.6, 0.38, run);
  T[0] = hx0 + amp * sw; T[1] = hy + 0.1 * max(0, sw) * (1 - run) + 0.13 * sw * run; T[2] = -0.24 + 0.02 * run;
  T[3] = hx0 - amp * sw; T[4] = hy + 0.1 * max(0, -sw) * (1 - run) - 0.13 * sw * run; T[5] = 0.24 - 0.02 * run;
  const si = sg > 0 ? 3 : 0, oi = sg > 0 ? 0 : 3; // main forte / autre main
  if (!holding && guard <= 0.5 && !gk) { T[0] += still * (0.16 + 0.03 * iv); T[3] += still * (0.16 - 0.03 * iv); T[1] += still * (0.12 + 0.03 * iw); T[4] += still * (0.12 - 0.03 * iw); T[2] += still * 0.03; T[5] -= still * 0.03; }
  if (guard > 0.5) { // garde défensive : un bras haut, l'autre vers le porteur, différente d'un joueur à l'autre
    const up = p.stance > 1.5 ? 1 : 0, od = p.id & 1 ? 1 : -1, a = 0.12 * iw;
    const osc = 0.2 * sin(p.ph * TAU) * mv + 0.05 * iw; // bras hauts devant le porteur, sinon bras prêts, coudes pliés, jamais symétriques
    if (up) { T[0] = 0.3 + 0.08 * od; T[3] = 0.3 - 0.08 * od; T[1] = 1.42 + 0.16 * od + a + osc; T[4] = 1.42 - 0.16 * od - a - osc; T[2] = -0.46 - 0.04 * iv; T[5] = 0.46 - 0.04 * iv; }
    else { T[0] = 0.3 + 0.05 * od + osc; T[3] = 0.3 - 0.05 * od - osc; T[1] = 1.2 + 0.1 * od + a; T[4] = 1.2 - 0.1 * od - a; T[2] = -0.42 - 0.04 * iv; T[5] = 0.42 - 0.04 * iv; }
    if (p.touch >= 0 && p.act === A_NONE && sp < 1.4) { const q = PLAYERS[p.touch], dx = q.x - p.x, dz = q.z - p.z, lx = clamp(dx * fx + dz * fz - 0.27, 0.1, 0.55), lz = clamp(dx * rx + dz * rz, -0.5, 0.5); T[0] = T[3] = lx; T[1] = 1.32; T[4] = 1.08; T[2] = lz - 0.15; T[5] = lz + 0.15; rate = 18; }
  }
  if (gk) { const out = sat((HALF_L - abs(p.x) - 1.6) / 0.8); T[0] = T[3] = 0.26; T[1] = T[4] = 1.28 + 0.5 * out; T[2] = -0.5 - 0.08 * out; T[5] = 0.5 + 0.08 * out; } // sorti en duel : bras hauts
  if (p.recv > 0 && ball && !holding) {
    const dx = ball.x - p.x, dz = ball.z - p.z, d = hyp(dx, dz);
    if (d < 2.6) { const lx = clamp(dx * fx + dz * fz, -0.2, 0.62), lz = clamp(dx * rx + dz * rz, -0.6, 0.6), ly = clamp((ball.y - p.y) / s, 0.5, 2.3); T[0] = T[3] = lx; T[1] = T[4] = ly; T[2] = lz - 0.1; T[5] = lz + 0.1; rate = 22; }
    else { T[0] = T[3] = 0.36; T[1] = T[4] = 1.36; T[2] = -0.17; T[5] = 0.17; }
  }
  if (holding) {
    if (p.drib) { // dribble : le bras reste le long du corps, l'avant-bras pivote au coude de +5° (ballon repris) à -40° (ballon poussé)
      const th = dribAngle(p.holdT); T[si] = cxl + 0.03 + 0.25 * cos(th); T[si + 1] = cyl - 0.26 + 0.25 * sin(th); T[si + 2] = 0.36 * sg; rate = 55; /* coude au flanc, plié à angle droit : seul l'avant-bras pompe */
      T[oi] = cxl + 0.1 - 0.12 * sw * sg; T[oi + 1] = cyl - 0.3; T[oi + 2] = -0.26 * sg; }
    else if (p.armed) { T[si] = -0.25; T[si + 1] = 1.84; T[si + 2] = 0.44 * sg; }
    else { T[si] = 0.22; T[si + 1] = 1.2; T[si + 2] = 0.25 * sg; T[oi] = 0.26; T[oi + 1] = 1.14; T[oi + 2] = -0.08 * sg; }
  }
  if (p.act === A_BLOCK) { T[0] = T[3] = 0.16; T[1] = T[4] = 2.32; T[2] = -0.2; T[5] = 0.2; rate = 26; }
  if (p.act === A_PASS) {
    const lx = p.passDx * fx + p.passDz * fz, lz = p.passDx * rx + p.passDz * rz, a = smooth(q / 0.6);
    T[si] = lerp(0.0, 0.52 * lx, a); T[si + 1] = lerp(1.5, 1.52, a); T[si + 2] = lerp(0.36 * sg, 0.5 * lz + 0.12 * sg, a); rate = 34;
  }
  if (shooting) {
    let tx2, ty2, tz2; const rr = sh.rel;
    if (q < rr * 0.55) { const a = smooth(q / (rr * 0.36)); tx2 = lerp(0.2, sh.W[0], a); ty2 = lerp(1.25, sh.W[1], a); tz2 = lerp(0.25, sh.W[2], a); }
    else if (q < rr) {
      let a = (q - rr * 0.55) / (rr * 0.45);
      if (sh.whip) a = smooth((a - 0.5) / 0.5); else if (sh.fake) { const f = (sh.fake - rr * 0.55) / (rr * 0.45); a = a < f ? 0.72 * smooth(a / f) : lerp(0.72, 1, smooth((a - f) / (1 - f))); } else a = a * a;
      // le coude part devant, la main passe à l'extérieur de l'épaule (et non au-dessus de la tête)
      const b1 = 1 - a, cx2 = (sh.W[0] + sh.R[0]) / 2 - 0.05, cy2 = (sh.W[1] + sh.R[1]) / 2 - 0.1, cz2 = max(sh.W[2], sh.R[2]) + 0.34;
      tx2 = b1 * b1 * sh.W[0] + 2 * a * b1 * cx2 + a * a * sh.R[0]; ty2 = b1 * b1 * sh.W[1] + 2 * a * b1 * cy2 + a * a * sh.R[1]; tz2 = b1 * b1 * sh.W[2] + 2 * a * b1 * cz2 + a * a * sh.R[2];
    } else { const a = smooth((q - rr) / (1 - rr)); tx2 = lerp(sh.R[0], sh.F[0], a); ty2 = lerp(sh.R[1], sh.F[1], a); tz2 = lerp(sh.R[2], sh.F[2], a); }
    T[si] = tx2; T[si + 1] = ty2; T[si + 2] = tz2 * sg; rate = 60;
    T[oi] = 0.32; T[oi + 1] = 1.42; T[oi + 2] = -0.3 * sg;
    if (sh.k === 'plongeant' && q > rr) { const lo = air ? 0.45 : 0.1; T[si] = 0.62; T[si + 1] = lo; T[si + 2] = 0.24 * sg; T[oi] = 0.58; T[oi + 1] = lo; T[oi + 2] = -0.24 * sg; rate = 30; }
  }
  if (p.act === A_SAVE && p.svOn) {
    const dx = p.svx - p.x, dz = p.svz - p.z, lx = dx * fx + dz * fz, lz = dx * rx + dz * rz, a = smooth((p.at - p.svR) / max(0.05, p.svD - p.svR));
    const ni = lz >= 0 ? 3 : 0, fi = lz >= 0 ? 0 : 3, ty = p.svy > 0.95 ? p.svy / s : (p.svy + 0.3) / s;
    T[ni] = lerp(T[ni], lx, a); T[ni + 1] = lerp(T[ni + 1], ty, a); T[ni + 2] = lerp(T[ni + 2], lz, a);
    const c = p.bit || abs(lz) < 0.45 ? 0.9 : 0.3; T[fi] = lerp(T[fi], lx, a * c); T[fi + 1] = lerp(T[fi + 1], p.svy > 0.95 ? ty : 1.3, a * c); T[fi + 2] = lerp(T[fi + 2], lz + (lz >= 0 ? -0.22 : 0.22), a * c);
    rate = 90;
  }
  if (p.sig > 0) { T[3] = p.sig === 1 ? 0.12 : 0.6; T[4] = p.sig === 1 ? 2.2 : 1.55; T[5] = 0.24; if (p.sig === 3) { T[0] = 0.6; T[1] = 1.55; T[2] = -0.24; } }
  const kh = 1 - Math.exp(-dt * rate), hc = p.hc;
  for (let i = 0; i < 6; i++) hc[i] += (T[i] - hc[i]) * kh;
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, o = i * 3, lx = hc[o], ly = hc[o + 1] * s + p.y, lz = hc[o + 2] * (i === (sg > 0 ? 1 : 0) || true ? 1 : 1);
    const sx = i ? srx : slx, sy = i ? sry : sly, sz = i ? srz : slz;
    let wx = p.x + fx * lx + rx * lz, wy = ly, wz = p.z + fz * lx + rz * lz;
    const up = wy > sy ? 1 : 0, e3 = (i ? ELR : ELL) * 3, ftx = fx * ct - rx * st, ftz = fz * ct - rz * st, eo = up ? 1.1 : 0.35 - 0.25 * mv * (1 - guard); // en course, les coudes restent près du corps
    _pp[0] = wx; _pp[1] = wy; _pp[2] = wz; if (torsoPush(J, s, p.build, tx, tz, ftx, ftz, 0.035)) { wx = _pp[0]; wz = _pp[2]; }
    if (p.touch >= 0) { const o = PLAYERS[p.touch], oc = cos(o.yaw), os = sin(o.yaw); _pp[0] = wx; _pp[1] = wy; _pp[2] = wz; if (torsoPush(o.J, o.h, o.build, -os, oc, oc, os, 0.05)) { wx = _pp[0]; wz = _pp[2]; }
      /* l'avant-bras non plus : si son milieu entre dans le tronc adverse, la main recule d'autant */
      _pp[0] = (sx + wx) / 2; _pp[1] = (sy + wy) / 2; _pp[2] = (sz + wz) / 2; const a0 = _pp[0], a2 = _pp[2]; if (torsoPush(o.J, o.h, o.build, -os, oc, oc, os, 0.04)) { wx += (_pp[0] - a0) * 2; wz += (_pp[2] - a2) * 2; } } // ni celui de l'adversaire au contact
    let r = ik2(J, e3, sx, sy, sz, wx, wy, wz, 0.3 * s, 0.275 * s, rx * side * eo - fx * 0.7, up ? -0.15 : -0.8, rz * side * eo - fz * 0.7);
    // avant-bras : si son milieu entre dans le tronc, la main s'écarte d'autant
    _pp[0] = (J[e3] + wx) / 2; _pp[1] = (J[e3 + 1] + wy) / 2; _pp[2] = (J[e3 + 2] + wz) / 2; const m0 = _pp[0], m2 = _pp[2];
    if (torsoPush(J, s, p.build, tx, tz, ftx, ftz, 0.045)) { wx += (_pp[0] - m0) * 2; wz += (_pp[2] - m2) * 2; r = ik2(J, e3, sx, sy, sz, wx, wy, wz, 0.3 * s, 0.275 * s, rx * side * eo - fx * 0.7, up ? -0.15 : -0.8, rz * side * eo - fz * 0.7); }
    // coude : s'il entre dans le tronc, il passe à l'extérieur
    _pp[0] = J[e3]; _pp[1] = J[e3 + 1]; _pp[2] = J[e3 + 2];
    if (torsoPush(J, s, p.build, tx, tz, ftx, ftz, 0.02)) r = ik2(J, e3, sx, sy, sz, wx, wy, wz, 0.3 * s, 0.275 * s, tx * side * 0.7 - ftx * 0.55, -0.6, tz * side * 0.7 - ftz * 0.55);
    if (r < 1) { wx = sx + (wx - sx) * r; wy = sy + (wy - sy) * r; wz = sz + (wz - sz) * r; }
    _setJ(J, i ? HAR : HAL, wx, wy, wz);
  }
}
// Position du ballon tenu : dans la main forte, légèrement au-delà du poignet.
const _bh = new Float32Array(3);
function ballHand(p) {
  const J = p.J, h = (p.lefty ? HAL : HAR) * 3, e = (p.lefty ? ELL : ELR) * 3;
  let dx = J[h] - J[e], dy = J[h + 1] - J[e + 1], dz = J[h + 2] - J[e + 2]; const l = 0.13 / max(0.01, hyp(dx, dy, dz));
  _bh[0] = J[h] + dx * l; _bh[1] = J[h + 1] + dy * l + 0.01; _bh[2] = J[h + 2] + dz * l; return _bh;
}
