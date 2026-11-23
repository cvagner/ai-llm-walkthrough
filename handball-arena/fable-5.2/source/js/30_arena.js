// Salle : tribunes, public, panneaux lumineux, buts, bancs, plafond. Tout est généré par le code ; marques et équipes inventées.
const BRANDS = [['NORVAL', '#0b3d5c', '#ffffff'], ['Kéraban', '#f4f1e8', '#b3261e'], ['ATELIER SUD', '#111418', '#ffc53d'], ['MISTRAL+', '#0f6e5a', '#eafff6'],
  ['Halle 7', '#e8582c', '#1a0d08'], ['TRIBORD NORD', '#1d2f6f', '#9fd0ff'], ['Oxalis', '#f2f4f6', '#256b3a'], ['LIGUE DES HÉRONS', '#5b1a7a', '#ffe9ff']];
const AT_W = 2048, AT_H = 1024, BAN_H = 100;
function buildAtlas() {
  const c = document.createElement('canvas'); c.width = AT_W; c.height = AT_H; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    const [name, bg, fg] = BRANDS[i]; g.fillStyle = bg; g.fillRect(0, i * BAN_H, AT_W, BAN_H); g.fillStyle = fg; g.textBaseline = 'middle'; g.textAlign = 'center';
    let fs = 64; g.font = `800 ${fs}px system-ui, "Segoe UI", sans-serif`; const tw = g.measureText(name).width; if (tw > 400) { fs = Math.floor(fs * 400 / tw); g.font = `800 ${fs}px system-ui, "Segoe UI", sans-serif`; }
    for (let c = 0; c < 4; c++) { g.fillText(name, c * 512 + 256, i * BAN_H + BAN_H / 2 + 3); g.fillRect(c * 512 + 18, i * BAN_H + 40, 20, 20); g.fillRect(c * 512 + 474, i * BAN_H + 40, 20, 20); }
  }
  g.textAlign = 'left';
  g.clearRect(0, 810, AT_W, 214); g.fillStyle = '#fff'; g.font = '900 200px system-ui, "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let d = 0; d < 10; d++) g.fillText(String(d), d * 128 + 64, 925);
  return mkTex(c, true);
}
let _sv = [];
function quad(a, b, c, d, n, col, uv, mat) { // uv = [u0, v0, u1, v1] : a = bas gauche, b = bas droit, c = haut droit, d = haut gauche
  const P = [a, b, c, a, c, d], U = [[uv[0], uv[3]], [uv[2], uv[3]], [uv[2], uv[1]], [uv[0], uv[3]], [uv[2], uv[1]], [uv[0], uv[1]]];
  for (let i = 0; i < 6; i++) _sv.push(P[i][0], P[i][1], P[i][2], n[0], n[1], n[2], col[0], col[1], col[2], U[i][0], U[i][1], mat);
}
function box(cx, cy, cz, sx, sy, sz, col, mat) {
  const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, u = [0, 0, 1, 1];
  quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, u, mat); quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, u, mat);
  quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, u, mat); quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, u, mat);
  quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], col, u, mat); quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], col, u, mat);
}
const M_PLAIN = 0, M_LED = 1, M_POST = 2, M_NET = 3, M_LIGHT = 4, M_BOARD = 5, M_DECAL = 7, M_RING = 8;
function buildBeams() { // faisceaux des projecteurs des passerelles, en fondu additif
  _sv = []; const c = [1, 0.95, 0.85];
  for (let s = -1; s <= 1; s += 2) for (let k = -6; k <= 6; k += 2) { const x = k * 5, z = s * 19.9, bx = k * 3.3, bz = s * 4.5, w0 = 0.35, w1 = 2.6;
    quad([bx - w1, 0.05, bz], [bx + w1, 0.05, bz], [x + w0, 13.6, z], [x - w0, 13.6, z], [0, 0, 1], c, [0, 0, 1, 1], 12);
  }
  return mkStatic(new Float32Array(_sv), false);
}
function buildArena(crowd) { // crowd : une paire de tampons d'instances par tribune (0 fond, 1 bout x<0, 2 côté caméra, 3 bout x>0)
  let crowdCap = crowd[0].c, crowdSph = crowd[0].s;
  _sv = []; const dark = [0.045, 0.05, 0.06], steel = [0.16, 0.17, 0.19], seat = [0.06, 0.09, 0.14];
  // panneaux lumineux : grands côtés et fonds
  let bi = 0; const ban = (i) => [0, (i * BAN_H + 2) / AT_H, 512 / AT_W, ((i + 1) * BAN_H - 2) / AT_H];
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 8; k++) {
      const x0 = -22 + k * 5.5, x1 = x0 + 5.4, z = s * 12.3, uv = ban(bi++ % 8); if (s > 0) box((x0 + x1) / 2, 0.47, z + s * 0.12, 5.4, 0.94, 0.2, dark, M_PLAIN);
      if (s < 0) quad([x0, 0.5, -12.82], [x1, 0.5, -12.82], [x1, 1.19, -12.82], [x0, 1.19, -12.82], [0, 0, 1], [1, 1, 1], uv, M_LED);
      else quad([x1, 0.04, z - 0.03], [x0, 0.04, z - 0.03], [x0, 0.9, z - 0.03], [x1, 0.9, z - 0.03], [0, 0, -1], [1, 1, 1], uv, M_LED);
    }
    for (let k = 0; k < 4; k++) {
      const z0 = -11 + k * 5.5, z1 = z0 + 5.4, x = s * 23.4, uv = ban(bi++ % 8); box(x + s * 0.12, 0.47, (z0 + z1) / 2, 0.2, 0.94, 5.4, dark, M_PLAIN);
      if (s > 0) quad([x - 0.03, 0.04, z0], [x - 0.03, 0.04, z1], [x - 0.03, 0.9, z1], [x - 0.03, 0.9, z0], [-1, 0, 0], [1, 1, 1], uv, M_LED);
      else quad([x + 0.03, 0.04, z1], [x + 0.03, 0.04, z0], [x + 0.03, 0.9, z0], [x + 0.03, 0.9, z1], [1, 0, 0], [1, 1, 1], uv, M_LED);
    }
  }
  // tribunes et public
  const pal = [[0.85, 0.86, 0.88], [0.05, 0.42, 0.47], [0.72, 0.1, 0.13], [0.12, 0.13, 0.16], [0.82, 0.7, 0.25], [0.25, 0.3, 0.5], [0.55, 0.56, 0.6], [0.9, 0.5, 0.3]];
  const skins = [[0.93, 0.76, 0.62], [0.82, 0.62, 0.47], [0.62, 0.44, 0.31], [0.42, 0.29, 0.2], [0.96, 0.82, 0.7]];
  let sid = 0;
  const hairs = [[0.07, 0.05, 0.04], [0.22, 0.13, 0.07], [0.5, 0.38, 0.2], [0.35, 0.33, 0.32], [0.12, 0.1, 0.1]];
  const person = (x, y, z, fx, fz, row) => {
    sid++; if (hash1(sid * 1.7) > 0.94) return; const c = pal[Math.floor(hash1(sid * 3.3) * 8)], sk = skins[Math.floor(hash1(sid * 9.1) * 5)], hc = hairs[Math.floor(hash1(sid * 7.7) * 5)], ph = hash1(sid * 5.9), up = hash1(sid * 2.9) > 0.9 ? 0.22 : 0, h = 0.5 + 0.1 * hash1(sid * 2.3) + up, d = 0.75;
    const rxx = -fz, rzz = fx;
    segI(crowdCap, x, y - 0.14, z, x + fx * 0.03, y + h, z + fz * 0.03, 0.17, 0.115, fx, 0, fz, c[0] * d, c[1] * d, c[2] * d, 7, 1.12, ph, 0, 0); // le bas du buste est caché dans le gradin : plus de pointe visible
    if (row < 7 && !up) for (let a = -1; a <= 1; a += 2) segI(crowdCap, x + rxx * a * 0.085, y + 0.16, z + rzz * a * 0.085, x + rxx * a * 0.1 + fx * 0.38, y + 0.14, z + rzz * a * 0.1 + fz * 0.38, 0.07, 0.065, 0, 1, 0, 0.1, 0.11, 0.16, 7, 0.9, ph, 0, 0);
    if (row < 8 || hash1(sid * 4.1) > 0.7) for (let a = -1; a <= 1; a += 2) { const raise = hash1(sid * 8.3 + a) > 0.86, sx0 = x + rxx * a * 0.18, sz0 = z + rzz * a * 0.18, ex = sx0 + rxx * a * 0.04 + fx * (raise ? 0.1 : 0.06), ey = raise ? y + h + 0.08 : y + h * 0.42, ez = sz0 + rzz * a * 0.04 + fz * (raise ? 0.1 : 0.06);
      segI(crowdCap, sx0, y + h * 0.88, sz0, ex, ey, ez, 0.048, 0.048, fx, 0, fz, c[0] * d, c[1] * d, c[2] * d, 7, 0.9, ph, 0, 0);
      if (row < 8) segI(crowdCap, ex, ey, ez, raise ? ex + fx * 0.05 : x + rxx * a * 0.07 + fx * 0.3, raise ? ey + 0.26 : y + 0.24, raise ? ez + fz * 0.05 : z + rzz * a * 0.07 + fz * 0.3, 0.04, 0.04, fx, 0, fz, sk[0] * d, sk[1] * d, sk[2] * d, 7, 0.8, ph, 0, 0); }
    sphI(crowdSph, x + fx * 0.04, y + h + 0.1, z + fz * 0.04, 0.085, 0.105, 0.095, 0, 1, 0, fx, 0, fz, sk[0] * d, sk[1] * d, sk[2] * d, 7, ph, 0, 0);
    if (hash1(sid * 6.1) > 0.12) sphI(crowdSph, x + fx * 0.02, y + h + 0.13, z + fz * 0.02, 0.09, 0.098, 0.1, 0, 1, 0, fx, 0, fz, hc[0], hc[1], hc[2], 7, ph, 0, 0);
  };
  const seatC = [0.05, 0.16, 0.2], stepC = [0.2, 0.21, 0.24];
  for (let s = -1; s <= 1; s += 2) {
    crowdCap = crowd[s < 0 ? 0 : 2].c; crowdSph = crowd[s < 0 ? 0 : 2].s;
    box(0, 0.6, s * 13.0, 52, 1.2, 0.3, steel, M_PLAIN);
    for (let r = 0; r < 16; r++) {
      const z = s * (13.55 + r * 0.85), y = 1.2 + r * 0.45; box(0, y / 2, z, 52, y, 0.85, seat, M_PLAIN); box(0, y + 0.26, z + s * 0.36, 52, 0.5, 0.07, seatC, M_PLAIN);
      for (const ax of [-17.4, -8.7, 0, 8.7, 17.4]) box(ax, y + 0.03, z, 1.1, 0.07, 0.87, stepC, M_PLAIN);
      for (let x = -25.6; x < 25.7; x += 0.56) { const m = abs(((x + 26.1) % 8.7) - 4.35); if (m > 3.7) continue; person(x + 0.08 * hash1(sid), y, z + s * 0.12, 0, -s, r); }
    }
    crowdCap = crowd[s < 0 ? 1 : 3].c; crowdSph = crowd[s < 0 ? 1 : 3].s;
    box(s * 24.3, 0.6, 0, 0.3, 1.2, 26.3, steel, M_PLAIN);
    for (let r = 0; r < 14; r++) {
      const x = s * (24.85 + r * 0.85), y = 1.2 + r * 0.45; box(x, y / 2, 0, 0.85, y, 26.3, seat, M_PLAIN); box(x + s * 0.36, y + 0.26, 0, 0.07, 0.5, 26.3, seatC, M_PLAIN);
      for (const az of [-6.5, 6.5]) box(x, y + 0.03, az, 0.87, 0.07, 1.1, stepC, M_PLAIN);
      for (let z = -12.8; z < 12.9; z += 0.56) { if (abs(abs(z) - 6.5) < 0.62) continue; person(x + s * 0.12, y, z, -s, 0, r); }
    }
  }
  crowdCap = crowd[0].c; crowdSph = crowd[0].s;
  // murs, plafond et rampes d'éclairage
  const wc = [0.16, 0.19, 0.25];
  box(0, 9, -27.8, 80, 18, 0.4, wc, M_PLAIN); box(0, 9, 27.8, 80, 18, 0.4, wc, M_PLAIN);
  // bandeau lumineux en haut des tribunes, passerelles et projecteurs
  for (let k = 0; k < 12; k++) { const x0 = -36 + k * 6, uv = ban(k % 8); quad([x0, 9.6, -27.55], [x0 + 5.9, 9.6, -27.55], [x0 + 5.9, 10.5, -27.55], [x0, 10.5, -27.55], [0, 0, 1], [1, 1, 1], uv, M_LED); }
  for (let k = 0; k < 9; k++) { const z0 = -27 + k * 6, uv = ban((k + 3) % 8); quad([-36.95, 9.6, z0 + 5.9], [-36.95, 9.6, z0], [-36.95, 10.5, z0], [-36.95, 10.5, z0 + 5.9], [1, 0, 0], [1, 1, 1], uv, M_LED); quad([36.95, 9.6, z0], [36.95, 9.6, z0 + 5.9], [36.95, 10.5, z0 + 5.9], [36.95, 10.5, z0], [-1, 0, 0], [1, 1, 1], uv, M_LED); }
  for (let s = -1; s <= 1; s += 2) { box(0, 14.2, s * 20, 70, 0.25, 1.2, steel, M_PLAIN); for (let k = -6; k <= 6; k++) { box(k * 5, 13.85, s * 20, 0.5, 0.4, 0.5, [0.1, 0.1, 0.12], M_PLAIN); box(k * 5, 13.62, s * 19.9, 0.36, 0.06, 0.36, [1, 0.96, 0.88], M_LIGHT); } }
  box(-37.2, 9, 0, 0.4, 18, 56, wc, M_PLAIN); box(37.2, 9, 0, 0.4, 18, 56, wc, M_PLAIN);
  box(0, 18.2, 0, 80, 0.4, 56, [0.045, 0.05, 0.065], M_PLAIN);
  for (let i = -4; i <= 4; i++) { box(i * 8.5, 17.1, 0, 0.35, 1.3, 55, [0.11, 0.12, 0.15], M_PLAIN); box(i * 8.5, 16.5, 0, 0.6, 0.12, 55, steel, M_PLAIN); }
  for (let j = -3; j <= 3; j++) { box(0, 17.3, j * 8.5, 74, 0.9, 0.3, [0.11, 0.12, 0.15], M_PLAIN); }
  for (let s2 = -1; s2 <= 1; s2 += 2) { // loges vitrées et garde-corps en haut des tribunes
    box(0, 12.6, s2 * 27.4, 74, 2.6, 0.5, [0.07, 0.08, 0.1], M_PLAIN); for (let k = -8; k <= 8; k++) box(k * 4.2, 12.7, s2 * 27.1, 3.6, 1.5, 0.08, [0.005, 0.007, 0.011], M_LIGHT);
    box(0, 8.75, s2 * 26.9, 52, 0.08, 0.08, steel, M_PLAIN); box(s2 * 36.9, 12.6, 0, 0.5, 2.6, 54, [0.07, 0.08, 0.1], M_PLAIN); for (let k = -5; k <= 5; k++) box(s2 * 36.6, 12.7, k * 4.6, 0.08, 1.5, 4, [0.005, 0.007, 0.011], M_LIGHT);
  }
  for (let i = -3; i <= 3; i++) { box(i * 8, 15.6, 0, 0.25, 0.5, 40, steel, M_PLAIN); for (let j = -2; j <= 2; j++) box(i * 8, 15.25, j * 7.5, 2.6, 0.12, 0.9, [1, 0.97, 0.9], M_LIGHT); }
  for (let j = -2; j <= 2; j++) box(0, 15.9, j * 7.5, 56, 0.3, 0.2, steel, M_PLAIN);
  // tableau d'affichage suspendu
  box(0, 12.6, 0, 4.4, 2.4, 4.4, dark, M_PLAIN);
  quad([-2.1, 11.5, 2.21], [2.1, 11.5, 2.21], [2.1, 13.7, 2.21], [-2.1, 13.7, 2.21], [0, 0, 1], [1, 1, 1], [0, 0, 1, 1], M_BOARD);
  quad([2.1, 11.5, -2.21], [-2.1, 11.5, -2.21], [-2.1, 13.7, -2.21], [2.1, 13.7, -2.21], [0, 0, -1], [1, 1, 1], [0, 0, 1, 1], M_BOARD);
  quad([2.21, 11.5, 2.1], [2.21, 11.5, -2.1], [2.21, 13.7, -2.1], [2.21, 13.7, 2.1], [1, 0, 0], [1, 1, 1], [0, 0, 1, 1], M_BOARD);
  quad([-2.21, 11.5, -2.1], [-2.21, 11.5, 2.1], [-2.21, 13.7, 2.1], [-2.21, 13.7, -2.1], [-1, 0, 0], [1, 1, 1], [0, 0, 1, 1], M_BOARD);
  // bancs et table de marque (côté opposé à la caméra)
  for (const [cx, cc] of [[-3.2, [0.92, 0.93, 0.95]], [3.2, [0.7, 0.07, 0.11]]]) { for (let lg = -1; lg <= 1; lg += 2) segI(crowdCap, cx + lg * 0.09, 0.0, -11.0, cx + lg * 0.09, 0.98, -11.0, 0.075, 0.08, 0, 0, 1, 0.3, 0.32, 0.4, 7, 1.0, 0.3, 0, 0); segI(crowdCap, cx, 0.9, -11.0, cx, 1.5, -11.0, 0.19, 0.12, 0, 0, 1, cc[0] * 1.5, cc[1] * 1.5, cc[2] * 1.5, 7, 1.25, 0.3, 0, 0); sphI(crowdSph, cx, 1.64, -11.0, 0.09, 0.11, 0.1, 0, 1, 0, 0, 0, 1, 1.1, 0.85, 0.7, 7, 0.3, 0, 0); } // entraîneurs debout
  for (const x of [-7.5, 7.5]) { box(x, 0.24, -11.5, 7, 0.06, 0.42, [0.3, 0.31, 0.34], M_PLAIN); box(x, 0.5, -11.74, 7, 0.5, 0.05, [0.3, 0.31, 0.34], M_PLAIN); for (let k = -3; k <= 3; k++) box(x + k * 1.1, 0.12, -11.5, 0.05, 0.24, 0.4, steel, M_PLAIN); }
  for (const [bx, col] of [[-7.5, [0.92, 0.93, 0.95]], [7.5, [0.7, 0.07, 0.11]]]) for (let k = -3; k <= 3; k++) { const x = bx + k * 0.95, sk = skins[(k + 7) % 5], hc = [0.1 + 0.08 * ((k + 3) % 3), 0.07, 0.05];
    const c = [col[0] * 1.6, col[1] * 1.6, col[2] * 1.6], s2 = [sk[0] * 1.5, sk[1] * 1.5, sk[2] * 1.5], sh = [0.12, 0.14, 0.2];
    segI(crowdCap, x, 0.3, -11.5, x, 0.86, -11.45, 0.18, 0.12, 0, 0, 1, c[0], c[1], c[2], 7, 1.2, 0.5, 0, 0); /* remplaçant assis : buste, cuisses, tibias, pieds, bras posés sur les cuisses */
    for (let a = -1; a <= 1; a += 2) { const lx = x + a * 0.1;
      segI(crowdCap, lx, 0.36, -11.48, lx, 0.36, -11.02, 0.075, 0.07, 0, 1, 0, sh[0], sh[1], sh[2], 7, 0.9, 0.5, 0, 0); segI(crowdCap, lx, 0.36, -11.02, lx, 0.04, -10.96, 0.055, 0.055, 0, 0, 1, s2[0], s2[1], s2[2], 7, 0.8, 0.5, 0, 0);
      segI(crowdCap, lx, 0.035, -11.02, lx, 0.035, -10.78, 0.05, 0.035, 0, 1, 0, 1.2, 1.2, 1.25, 7, 0.9, 0.5, 0, 0);
      segI(crowdCap, x + a * 0.2, 0.8, -11.46, x + a * 0.2, 0.52, -11.3, 0.05, 0.05, 0, 0, 1, c[0], c[1], c[2], 7, 0.9, 0.5, 0, 0); segI(crowdCap, x + a * 0.2, 0.52, -11.3, lx, 0.44, -11.08, 0.04, 0.04, 0, 0, 1, s2[0], s2[1], s2[2], 7, 0.8, 0.5, 0, 0); }
    sphI(crowdSph, x, 0.98, -11.44, 0.09, 0.11, 0.1, 0, 1, 0, 0, 0, 1, sk[0] * 1.5, sk[1] * 1.5, sk[2] * 1.5, 7, 0.5, 0, 0); sphI(crowdSph, x, 1.01, -11.45, 0.094, 0.1, 0.104, 0, 1, 0, 0, 0, 1, hc[0], hc[1], hc[2], 7, 0.5, 0, 0); }
  for (let k = -1; k <= 1; k++) { const x = k * 1.05, sk = skins[(k + 2) % 5]; segI(crowdCap, x, 0.5, -12.0, x, 1.1, -11.95, 0.18, 0.12, 0, 0, 1, 0.5, 0.5, 0.55, 7, 1.3, 0.5, 0, 0); sphI(crowdSph, x, 1.22, -11.93, 0.09, 0.11, 0.1, 0, 1, 0, 0, 0, 1, sk[0] * 1.5, sk[1] * 1.5, sk[2] * 1.5, 7, 0.5, 0, 0); }
  box(0, 0.39, -11.55, 3.4, 0.78, 0.7, [0.1, 0.12, 0.16], M_PLAIN); box(0, 0.8, -11.55, 3.5, 0.04, 0.8, [0.2, 0.22, 0.26], M_PLAIN);
  // buts : montants et traverse de 8 cm, bandes de deux couleurs, filet
  for (let s = -1; s <= 1; s += 2) {
    const xf = s * (HALF_L - POST / 2), zp = GOAL_W / 2 + POST / 2;
    box(xf, (GOAL_H + POST) / 2, -zp, POST, GOAL_H + POST, POST, [1, 1, 1], M_POST); box(xf, (GOAL_H + POST) / 2, zp, POST, GOAL_H + POST, POST, [1, 1, 1], M_POST);
    box(xf, GOAL_H + POST / 2, 0, POST, POST, GOAL_W + 2 * POST, [1, 1, 1], M_POST);
    const xb = s * (HALF_L + 1.05), xt = s * (HALF_L + 0.8), x0 = s * HALF_L, zz = GOAL_W / 2 + POST, yt = GOAL_H + POST, n0 = [0.5, 0, 0], n1 = [0.5, 1, 0];
    const N = 7, bil = (a, b, c, d, u, v, k) => (a[k] * (1 - u) + b[k] * u) * (1 - v) + (d[k] * (1 - u) + c[k] * u) * v;
    const net = (a, b, c, d, wa, wb, wc, wd, uv) => { // a bas gauche, b bas droit, c haut droit, d haut gauche ; w = liberté du filet (0 sur le cadre)
      const pt = (u, v) => { const w = (wa * (1 - u) + wb * u) * (1 - v) + (wd * (1 - u) + wc * u) * v, sag = 0.3 * w * sin(PI * u) * sin(PI * min(1, v * 1.15)); return [bil(a, b, c, d, u, v, 0) + s * sag, bil(a, b, c, d, u, v, 1) - 0.12 * w * sin(PI * u), bil(a, b, c, d, u, v, 2), w * sin(PI * clamp(u, 0.02, 0.98)), uv[0] + (uv[2] - uv[0]) * u, uv[3] + (uv[1] - uv[3]) * v]; };
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const q = [pt(i / N, j / N), pt((i + 1) / N, j / N), pt((i + 1) / N, (j + 1) / N), pt(i / N, (j + 1) / N)]; for (const k of [0, 1, 2, 0, 2, 3]) _sv.push(q[k][0], max(0.01, q[k][1]), q[k][2], -s, 0.3, 0, 0.9, q[k][3], s, q[k][4], q[k][5], M_NET); } };
    net([xb, 0, -zz], [xb, 0, zz], [xt, yt, zz], [xt, yt, -zz], 1, 1, 1, 1, [0, 0, 31, 21]);       // fond
    net([x0, yt, -zz], [x0, yt, zz], [xt, yt, zz], [xt, yt, -zz], 0, 0, 1, 1, [0, 0, 31, 8]);       // dessus
    net([x0, 0, -zz], [xb, 0, -zz], [xt, yt, -zz], [x0, yt, -zz], 0, 1, 1, 0, [0, 0, 10, 21]);     // côtés
    net([x0, 0, zz], [xb, 0, zz], [xt, yt, zz], [x0, yt, zz], 0, 1, 1, 0, [0, 0, 10, 21]);
    box(xb, 0.03, 0, 0.05, 0.05, GOAL_W + 0.2, steel, M_PLAIN);
  }
  return mkStatic(new Float32Array(_sv), false);
}
