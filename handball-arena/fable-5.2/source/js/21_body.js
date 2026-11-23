// Corps des joueurs : surfaces continues balayées le long du squelette (tronc, bras, jambes), mains à cinq doigts, visage.
// Tables d'anneaux : [position le long de la chaîne (0 à 1), demi-largeur, demi-profondeur, indice de couleur].
const RT_TORSO = [[0, 0.05, 0.05, 0], [0.06, 0.12, 0.095, 0], [0.16, 0.156, 0.114, 0], [0.25, 0.16, 0.117, 0], [0.3, 0.153, 0.112, 1], [0.4, 0.14, 0.102, 1], [0.5, 0.148, 0.107, 1], [0.62, 0.17, 0.117, 1], [0.7, 0.184, 0.12, 1], [0.75, 0.188, 0.114, 1], [0.79, 0.168, 0.102, 1], [0.83, 0.118, 0.086, 1], [0.87, 0.072, 0.07, 2], [0.92, 0.06, 0.063, 2], [1, 0.057, 0.06, 2]];
const RT_ARM = [[0, 0.04, 0.04, 0], [0.05, 0.06, 0.062, 0], [0.14, 0.062, 0.064, 0], [0.22, 0.056, 0.058, 0], [0.24, 0.05, 0.052, 1], [0.36, 0.047, 0.05, 1], [0.47, 0.04, 0.042, 1], [0.53, 0.04, 0.042, 1], [0.62, 0.046, 0.047, 1], [0.78, 0.038, 0.04, 1], [0.93, 0.03, 0.028, 1], [1, 0.027, 0.022, 1]];
const RT_LEG = [[0, 0.06, 0.06, 0], [0.04, 0.092, 0.098, 0], [0.14, 0.098, 0.104, 0], [0.27, 0.09, 0.096, 0], [0.29, 0.08, 0.086, 1], [0.4, 0.068, 0.072, 1], [0.48, 0.056, 0.06, 1], [0.53, 0.055, 0.058, 1], [0.6, 0.058, 0.066, 1], [0.7, 0.056, 0.064, 1], [0.8, 0.046, 0.05, 1], [0.84, 0.047, 0.05, 2], [0.95, 0.04, 0.042, 2], [1, 0.038, 0.04, 2]];
const SEG_T = 14, SEG_A = 8, SEG_L = 10;
const KIT2 = new Float32Array(15);
let body = null, bodyN = 0; const C_WHITE = [1, 1, 1];
const _tp = new Float32Array(15), _td = new Float32Array(12), _cs = [];
function initBody() {
  const layout = [[RT_TORSO.length, SEG_T], [RT_ARM.length, SEG_A], [RT_LEG.length, SEG_L], [RT_ARM.length, SEG_A], [RT_LEG.length, SEG_L]]; // même ordre que pushPlayer
  let nv = 0; const idx = [];
  for (let p = 0; p < 16; p++) for (const [nr, sg] of layout) { for (let i = 0; i < nr - 1; i++) for (let j = 0; j < sg; j++) { const a = nv + i * (sg + 1) + j, b = a + 1, c = a + sg + 1, d = b + sg + 1; idx.push(a, c, b, b, c, d); } nv += nr * (sg + 1); } // un sommet de couture en plus par anneau
  const data = new Float32Array(nv * SSTR), m = mkStatic(data, true), ib = gl.createBuffer();
  gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW); gl.bindVertexArray(null);
  body = { vao: m.vao, vb: m.vb, data, nIdx: idx.length };
  for (const sg of [SEG_T, SEG_A, SEG_L]) { const t = new Float32Array(sg * 2); for (let j = 0; j < sg; j++) { t[j * 2] = cos(j / sg * TAU); t[j * 2 + 1] = sin(j / sg * TAU); } _cs[sg] = t; }
  for (let k = 0; k < 5; k++) { KIT2[k * 3] = KIT[k][1][0]; KIT2[k * 3 + 1] = KIT[k][1][1]; KIT2[k * 3 + 2] = KIT[k][1][2]; }
}
function upBody() { gl.bindBuffer(gl.ARRAY_BUFFER, body.vb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, body.data, 0, bodyN * SSTR); }
function drawBody() { gl.bindVertexArray(body.vao); gl.drawElements(gl.TRIANGLES, body.nIdx, gl.UNSIGNED_SHORT, 0); }
// Balaye une section elliptique le long de la ligne brisée _tp (np points) ; les plans de section sont lissés aux articulations.
function tube(np, RT, seg, hx, hy, hz, sx, sz, c0, m0, c1, m1, c2, m2, kit) {
  const P = _tp, D = _td, d = body.data, cs = _cs[seg], w = 0.3;
  for (let k = 0; k < np - 1; k++) { let x = P[k * 3 + 3] - P[k * 3], y = P[k * 3 + 4] - P[k * 3 + 1], z = P[k * 3 + 5] - P[k * 3 + 2]; const l = 1 / (hyp(x, y, z) || 1e-4); D[k * 3] = x * l; D[k * 3 + 1] = y * l; D[k * 3 + 2] = z * l; }
  for (let i = 0; i < RT.length; i++) {
    const r = RT[i], tt = r[0] * (np - 1), k = min(np - 2, Math.floor(tt)), f = tt - k;
    const px = lerp(P[k * 3], P[k * 3 + 3], f), py = lerp(P[k * 3 + 1], P[k * 3 + 4], f), pz = lerp(P[k * 3 + 2], P[k * 3 + 5], f);
    let tx = D[k * 3], ty = D[k * 3 + 1], tz = D[k * 3 + 2];
    if (f < w && k > 0) { const a = 0.5 + f / (2 * w); tx = lerp(D[k * 3 - 3], tx, a); ty = lerp(D[k * 3 - 2], ty, a); tz = lerp(D[k * 3 - 1], tz, a); }
    else if (f > 1 - w && k < np - 2) { const a = (f - (1 - w)) / (2 * w); tx = lerp(tx, D[k * 3 + 3], a); ty = lerp(ty, D[k * 3 + 4], a); tz = lerp(tz, D[k * 3 + 5], a); }
    let l = 1 / (hyp(tx, ty, tz) || 1); tx *= l; ty *= l; tz *= l;
    const kk = hx * tx + hy * ty + hz * tz; let xx = hx - tx * kk, xy = hy - ty * kk, xz = hz - tz * kk; l = hyp(xx, xy, xz);
    if (l < 1e-3) { xx = 1 - tx * tx; xy = -tx * ty; xz = -tx * tz; l = hyp(xx, xy, xz) || 1; } xx /= l; xy /= l; xz /= l;
    const zx = ty * xz - tz * xy, zy = tz * xx - tx * xz, zz = tx * xy - ty * xx, ci = r[3], c = ci === 0 ? c0 : ci === 1 ? c1 : c2, m = ci === 0 ? m0 : ci === 1 ? m1 : m2, rw = r[1] * sx, rd = r[2] * sz;
    for (let j = 0; j <= seg; j++) {
      const jj = j === seg ? 0 : j, ca = cs[jj * 2], sa = cs[jj * 2 + 1], o = bodyN++ * SSTR; let nx = xx * ca * rw + zx * sa * rd, ny = xy * ca * rw + zy * sa * rd, nz = xz * ca * rw + zz * sa * rd; const nl = 1 / (hyp(nx, ny, nz) || 1);
      d[o] = px + xx * ca * rd + zx * sa * rw; d[o + 1] = py + xy * ca * rd + zy * sa * rw; d[o + 2] = pz + xz * ca * rd + zz * sa * rw;
      d[o + 3] = nx * nl; d[o + 4] = ny * nl; d[o + 5] = nz * nl; d[o + 6] = c[0]; d[o + 7] = c[1]; d[o + 8] = c[2]; d[o + 9] = j / seg; d[o + 10] = kit + r[0] * 0.99; d[o + 11] = m;
    }
  }
}
/* accès aux articulations sans fermeture créée à chaque image */
let _J = null; const X = i => _J[i * 3], Y = i => _J[i * 3 + 1], Z = i => _J[i * 3 + 2];
function pushPlayer(p) {
  const J = p.J, s = p.h, gk = p.role === GB && !p.ref, ki = p.ref ? 4 : gk ? 2 + p.team : p.team, kit = KIT[ki], sk = SKIN[p.skin], hr = HAIR[p.hair];
  _J = J; const P = _tp;
  let ux = X(CHE) - X(PEL), uy = Y(CHE) - Y(PEL), uz = Z(CHE) - Z(PEL), l = 1 / hyp(ux, uy, uz); ux *= l; uy *= l; uz *= l;
  let rx = X(SHR) - X(SHL), ry = Y(SHR) - Y(SHL), rz = Z(SHR) - Z(SHL); l = 1 / hyp(rx, ry, rz); rx *= l; ry *= l; rz *= l;
  const fx = uy * rz - uz * ry, fy = uz * rx - ux * rz, fz = ux * ry - uy * rx, j = kit[0], c2 = kit[1], sh = kit[2], b = p.build, bw = s * (0.55 + 0.45 * b);
  // tronc : entrejambe, bassin, taille, poitrine, épaules, cou
  P[0] = X(PEL) - ux * 0.17 * s; P[1] = Y(PEL) - uy * 0.17 * s; P[2] = Z(PEL) - uz * 0.17 * s; P[3] = X(PEL); P[4] = Y(PEL); P[5] = Z(PEL);
  P[6] = (X(PEL) + X(CHE)) / 2 - fx * 0.012; P[7] = (Y(PEL) + Y(CHE)) / 2; P[8] = (Z(PEL) + Z(CHE)) / 2 - fz * 0.012; P[9] = X(CHE); P[10] = Y(CHE); P[11] = Z(CHE);
  P[12] = lerp(X(CHE), X(HEAD), 0.62); P[13] = lerp(Y(CHE), Y(HEAD), 0.62); P[14] = lerp(Z(CHE), Z(HEAD), 0.62);
  tube(5, RT_TORSO, SEG_T, fx, fy, fz, s * b, bw, sh, 11, j, 10, sk, 9, ki);
  const hx = p.hdx, hz = p.hdz, hrx = -hz, hrz = hx;
  // tête : crâne, nez, oreilles, cheveux, barbe
  sphI(sphB, X(HEAD), Y(HEAD) + 0.006 * s, Z(HEAD), 0.083 * s, 0.116 * s, 0.103 * s, ux * 0.3, 1, uz * 0.3, hx, 0, hz, sk[0], sk[1], sk[2], 3, 0, 0, 0);
  // mâchoire, menton et pommettes : le visage n'est plus une boule
  sphI(sphB, X(HEAD) + hx * 0.014 * s, Y(HEAD) - 0.062 * s, Z(HEAD) + hz * 0.014 * s, 0.066 * s * (0.94 + 0.12 * hash1(p.id * 2.3)), 0.06 * s, 0.074 * s, 0, 1, 0, hx, 0, hz, sk[0], sk[1], sk[2], 1, 0, 0, 0);
  sphI(sphB, X(HEAD) + hx * 0.05 * s, Y(HEAD) - 0.098 * s, Z(HEAD) + hz * 0.05 * s, 0.034 * s, 0.022 * s, 0.03 * s, 0, 1, 0, hx, 0, hz, sk[0], sk[1], sk[2], 1, 0, 0, 0);
  // (pas de pommettes rapportées : elles donnaient un visage de marionnette)
  sphI(sphB, X(HEAD) + hx * 0.098 * s, Y(HEAD) - 0.012 * s, Z(HEAD) + hz * 0.098 * s, 0.015 * s, 0.03 * s, 0.024 * s, 0, 1, 0, hx, 0, hz, sk[0] * 0.96, sk[1] * 0.93, sk[2] * 0.92, 1, 0, 0, 0);
  for (let e = -1; e <= 1; e += 2) sphI(sphB, X(HEAD) + hrx * e * 0.081 * s, Y(HEAD) + 0.005 * s, Z(HEAD) + hrz * e * 0.081 * s, 0.012 * s, 0.027 * s, 0.017 * s, 0, 1, 0, hx, 0, hz, sk[0] * 0.95, sk[1] * 0.9, sk[2] * 0.9, 1, 0, 0, 0);
  if (p.hair !== 3) { const lg = p.hair === 2 ? 1.07 : 1; sphI(sphB, X(HEAD) - hx * 0.02 * s * lg, Y(HEAD) + 0.036 * s, Z(HEAD) - hz * 0.02 * s * lg, 0.088 * s, 0.104 * s * lg, 0.106 * s * lg, ux * 0.3, 1, uz * 0.3, hx, 0, hz, hr[0], hr[1], hr[2], 0, 0, 0, 0); }
  if (p.hair === 1 || p.hair === 3 || p.hair === 4) sphI(sphB, X(HEAD) + hx * 0.016 * s, Y(HEAD) - 0.068 * s, Z(HEAD) + hz * 0.016 * s, 0.072 * s, 0.062 * s, 0.083 * s, 0, 1, 0, hx, 0, hz, hr[0] * 1.2 + 0.02, hr[1] * 1.2 + 0.02, hr[2] * 1.2 + 0.02, 0, 0, 0, 0);
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1, S0 = i ? SHR : SHL, E = i ? ELR : ELL, H = i ? HAR : HAL, HI = i ? HIR : HIL, K = i ? KNR : KNL, A = i ? ANR : ANL, T = i ? TOR : TOL;
    // bras : le plan de flexion du coude oriente la section
    P[0] = X(S0) - rx * sd * 0.02; P[1] = Y(S0) + 0.012; P[2] = Z(S0) - rz * sd * 0.02; P[3] = X(E); P[4] = Y(E); P[5] = Z(E); P[6] = X(H); P[7] = Y(H); P[8] = Z(H);
    let ex = X(E) - (X(S0) + X(H)) / 2, ey = Y(E) - (Y(S0) + Y(H)) / 2, ez = Z(E) - (Z(S0) + Z(H)) / 2; if (hyp(ex, ey, ez) < 0.02) { ex = -fx; ey = -fy; ez = -fz; }
    tube(3, RT_ARM, SEG_A, ex, ey, ez, bw, bw, gk ? j : c2, 11, gk ? j : sk, gk ? 11 : 9, sk, 9, ki);
    // main : paume et cinq doigts
    let dx = X(H) - X(E), dy = Y(H) - Y(E), dz = Z(H) - Z(E); l = 1 / (hyp(dx, dy, dz) || 1); dx *= l; dy *= l; dz *= l;
    let qx = dy * ez - dz * ey, qy = dz * ex - dx * ez, qz = dx * ey - dy * ex; l = 1 / (hyp(qx, qy, qz) || 1); qx *= l; qy *= l; qz *= l; // largeur de la paume
    const nx = qy * dz - qz * dy, ny = qz * dx - qx * dz, nz = qx * dy - qy * dx; // normale de la paume
    const holding = S.ball.state === B_HELD && S.ball.holder === p.id && (p.lefty ? i === 0 : i === 1) && !p.drib;
    if (holding) {
      const bx = S.ball.x, by = S.ball.y, bz = S.ball.z; let px = X(H) - bx, py = Y(H) - by, pz = Z(H) - bz; l = 1 / (hyp(px, py, pz) || 1); px *= l; py *= l; pz *= l;
      let ax = py * fz - pz * fy, ay = pz * fx - px * fz, az = px * fy - py * fx; l = 1 / (hyp(ax, ay, az) || 1); ax *= l; ay *= l; az *= l; const wx = py * az - pz * ay, wy = pz * ax - px * az, wz = px * ay - py * ax;
      const R1 = BALL_R + 0.011;
      sphI(sphB, bx + px * (R1 + 0.006), by + py * (R1 + 0.006), bz + pz * (R1 + 0.006), 0.046 * s, 0.016 * s, 0.05 * s, px, py, pz, ax, ay, az, sk[0], sk[1], sk[2], 1, 0, 0, 0);
      for (let f = 0; f < 5; f++) { const a = f === 0 ? -2.3 * sd : (f - 2.5) * 0.5 * sd, /* quatre doigts serrés et un pouce opposé */ ca = cos(a), sa = sin(a), tx2 = ax * ca + wx * sa, ty2 = ay * ca + wy * sa, tz2 = az * ca + wz * sa;
        for (let g = 0; g < 3; g++) { const a0 = 0.3 + g * 0.4, a1 = a0 + 0.44, c0 = cos(a0), s0 = sin(a0), c1 = cos(a1), s1 = sin(a1);
          segI(capB, bx + (px * c0 + tx2 * s0) * R1, by + (py * c0 + ty2 * s0) * R1, bz + (pz * c0 + tz2 * s0) * R1, bx + (px * c1 + tx2 * s1) * R1, by + (py * c1 + ty2 * s1) * R1, bz + (pz * c1 + tz2 * s1) * R1, 0.0105 * s, 0.0105 * s, px, py, pz, sk[0], sk[1], sk[2], 1, 0.85, 0, 0, 0); } }
    } else {
      const cx = X(H) + dx * 0.045 * s, cy = Y(H) + dy * 0.045 * s, cz = Z(H) + dz * 0.045 * s, curl = p.stance > 0.5 || gk ? 0.12 : 0.5 + 0.9 * p.rS; /* poings mi-clos en course */
      sphI(sphB, cx, cy, cz, 0.04 * s, 0.05 * s, 0.016 * s, dx, dy, dz, nx, ny, nz, sk[0], sk[1], sk[2], 1, 0, 0, 0);
      for (let f = 0; f < 4; f++) { const o = (f - 1.5) * 0.02 * s, x0 = cx + dx * 0.042 * s + qx * o, y0 = cy + dy * 0.042 * s + qy * o, z0 = cz + dz * 0.042 * s + qz * o, sp = (f - 1.5) * 0.12, ln = (f === 0 || f === 3 ? 0.062 : 0.074) * s;
        segI(capB, x0, y0, z0, x0 + (dx + qx * sp + nx * curl) * ln, y0 + (dy + qy * sp + ny * curl) * ln, z0 + (dz + qz * sp + nz * curl) * ln, 0.0095 * s, 0.0095 * s, nx, ny, nz, sk[0], sk[1], sk[2], 1, 0.8, 0, 0, 0); }
      const tb = 0.034 * s * sd * (p.lefty ? 1 : 1); segI(capB, cx - qx * tb + 0, cy - qy * tb, cz - qz * tb, cx - qx * tb * 1.9 + dx * 0.045 * s + nx * 0.02, cy - qy * tb * 1.9 + dy * 0.045 * s + ny * 0.02, cz - qz * tb * 1.9 + dz * 0.045 * s + nz * 0.02, 0.011 * s, 0.011 * s, nx, ny, nz, sk[0], sk[1], sk[2], 1, 0.8, 0, 0, 0);
    }
    // jambe
    P[0] = X(HI); P[1] = Y(HI) + 0.07 * s; P[2] = Z(HI); P[3] = X(K); P[4] = Y(K); P[5] = Z(K); P[6] = X(A); P[7] = Y(A) - 0.01; P[8] = Z(A);
    tube(3, RT_LEG, SEG_L, fx, fy, fz, bw, bw, sh, 11, gk ? sh : sk, gk ? 11 : 9, gk ? sh : kit[3], 11, ki);
    let tx = X(T) - X(A), ty = Y(T) - Y(A), tz = Z(T) - Z(A); l = 1 / (hyp(tx, ty, tz) || 1); tx *= l; ty *= l; tz *= l;
    segI(capB, X(A) - tx * 0.085 * s, Y(A) - 0.03 * s - ty * 0.05, Z(A) - tz * 0.085 * s, X(T) + tx * 0.03, Y(T), Z(T) + tz * 0.03, 0.05 * s, 0.045 * s, 0, 1, 0, kit[4][0], kit[4][1], kit[4][2], 4, 0.85, 0, 0, 0);
  }
  // numéros (dos et poitrine)
  if (!p.ref && ((R.cam.x - X(CHE)) * fx + (R.cam.y - Y(CHE)) * fy + (R.cam.z - Z(CHE)) * fz) > 0.15) { // sponsor de poitrine
    const o = 0.136 * s * b, w = 0.1 * s, hh = 0.022 * s, cx = X(PEL) + ux * 0.27 * s + fx * o, cy = Y(PEL) + uy * 0.27 * s + fy * o, cz = Z(PEL) + uz * 0.27 * s + fz * o, row = p.team ? 2 : 3;
    decQuad(cx + rx * w, cy + ry * w, cz + rz * w, cx - rx * w, cy - ry * w, cz - rz * w, cx - rx * w + ux * hh * 2, cy - ry * w + uy * hh * 2, cz - rz * w + uz * hh * 2, cx + rx * w + ux * hh * 2, cy + ry * w + uy * hh * 2, cz + rz * w + uz * hh * 2, C_WHITE, 40 / AT_W, (row * BAN_H + 12) / AT_H, 472 / AT_W, (row * BAN_H + 88) / AT_H, 13);
  }
  if (!p.ref) {
    const nc = kit[5], n = p.num, d1 = n >= 10 ? Math.floor(n / 10) % 10 : -1, d0 = n % 10, v0 = 818 / AT_H, v1 = 1022 / AT_H;
    for (let side = -1; side <= 1; side += 2) {
      if (((R.cam.x - X(CHE)) * fx + (R.cam.y - Y(CHE)) * fy + (R.cam.z - Z(CHE)) * fz) * side < 0.15) continue; // face cachée
      const dw = (side < 0 ? 0.088 : 0.058) * s, dh = (side < 0 ? 0.21 : 0.14) * s, off = (side < 0 ? 0.142 : 0.138) * s * b * side, up = side < 0 ? 0.26 : 0.36, nd = d1 >= 0 ? 2 : 1;
      const cx = X(PEL) + ux * up * s + fx * off + (side > 0 ? rx * 0.07 * s : 0), cy = Y(PEL) + uy * up * s + fy * off, cz = Z(PEL) + uz * up * s + fz * off + (side > 0 ? rz * 0.07 * s : 0);
      for (let k = 0; k < nd; k++) {
        const dg = nd === 2 ? (k === 0 ? d1 : d0) : d0, o0 = (k - nd / 2) * dw * -side, o1 = (k + 1 - nd / 2) * dw * -side;
        decQuad(cx + rx * o0, cy + ry * o0, cz + rz * o0, cx + rx * o1, cy + ry * o1, cz + rz * o1, cx + rx * o1 + ux * dh, cy + ry * o1 + uy * dh, cz + rz * o1 + uz * dh, cx + rx * o0 + ux * dh, cy + ry * o0 + uy * dh, cz + rz * o0 + uz * dh, nc, (dg * 128 + 14) / AT_W, v0, (dg * 128 + 114) / AT_W, v1, M_DECAL);
      }
    }
  }
}
