// Contexte WebGL2, programmes et maillages unitaires. Aucune bibliothèque.
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
if (!gl) { const e = document.getElementById('err'); e.style.display = 'flex'; e.textContent = 'Ce jeu a besoin de WebGL2 (Chrome, Edge ou Firefox récents sur ordinateur).'; throw new Error('WebGL2 indisponible'); }
const HDR = !!gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');
function mkProg(vs, fs) {
  const p = gl.createProgram();
  for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(t); gl.shaderSource(s, '#version 300 es\nprecision highp float;precision highp sampler2DShadow;\n' + src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 3) + ': ' + l).join('\n'));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name.replace('[0]', ''); u[nm] = gl.getUniformLocation(p, nm); }
  return { p, u };
}
// Capsule unitaire : axe y de 0 à 1, rayon 1 au milieu, extrémités arrondies (profil musculaire).
function capsuleMesh(seg, rings, cap, ts) { /* ts : positions des anneaux le long de l'axe, pour garder un fût droit avec peu d'anneaux */
  const v = [], cf = cap || 0.13, prof = t => { const e = min(t, 1 - t) / cf, c = e >= 1 ? 1 : sqrt(max(0, 1 - (1 - e) * (1 - e))); return c * (0.9 + 0.13 * sin(PI * t)); };
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const quad = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]];
    for (const [a, b] of quad) {
      const t = ts ? ts[a] : a / rings, th = b / seg * TAU, r = a === 0 || a === rings ? 0 : prof(t), dr = (prof(t + 0.01) - prof(t - 0.01)) / 0.02;
      let nx = cos(th), ny = -dr * 0.25, nz = sin(th); if (a === 0) { nx = 0; ny = -1; nz = 0; } if (a === rings) { nx = 0; ny = 1; nz = 0; }
      const l = hyp(nx, ny, nz); v.push(cos(th) * r, t, sin(th) * r, nx / l, ny / l, nz / l);
    }
  }
  return new Float32Array(v);
}
function sphereMesh(seg, rings) {
  const v = [];
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) for (const [a, b] of [[i, j], [i + 1, j + 1], [i + 1, j], [i, j], [i, j + 1], [i + 1, j + 1]]) {
    const ph = a / rings * PI, th = b / seg * TAU, x = sin(ph) * cos(th), y = cos(ph), z = sin(ph) * sin(th); v.push(x, y, z, x, y, z);
  }
  return new Float32Array(v);
}
// Tampon d'instances : matrice (16) + couleur/matériau (4) + paramètres (4).
const ISTR = 24;
function mkInst(mesh, maxN, dynamic) {
  const vao = gl.createVertexArray(), vb = gl.createBuffer(), ib = gl.createBuffer(), data = new Float32Array(maxN * ISTR);
  gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
  for (let i = 0; i < 6; i++) { gl.enableVertexAttribArray(2 + i); gl.vertexAttribPointer(2 + i, 4, gl.FLOAT, false, ISTR * 4, i * 16); gl.vertexAttribDivisor(2 + i, 1); }
  gl.bindVertexArray(null);
  return { vao, ib, data, n: 0, verts: mesh.length / 6, maxN };
}
function upInst(I) { gl.bindBuffer(gl.ARRAY_BUFFER, I.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, I.data, 0, I.n * ISTR); }
function drawInst(I) { if (!I.n) return; gl.bindVertexArray(I.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, I.verts, I.n); }
// Écrit une instance : segment a→b, demi-axes rx (latéral) et rz (profondeur), repère orienté par l'indice h (direction « avant »).
function segI(I, ax, ay, az, bx, by, bz, rx, rz, hx, hy, hz, cr, cg, cb, mat, taper, q1, q2, q3) {
  if (I.n >= I.maxN) return; const d = I.data, o = I.n++ * ISTR;
  let yx = bx - ax, yy = by - ay, yz = bz - az; const yl = hyp(yx, yy, yz) || 1e-4, ux = yx / yl, uy = yy / yl, uz = yz / yl;
  let k = hx * ux + hy * uy + hz * uz, zx = hx - ux * k, zy = hy - uy * k, zz = hz - uz * k, zl = hyp(zx, zy, zz);
  if (zl < 1e-4) { zx = 1; zy = 0; zz = 0; k = ux; zx -= ux * k; zy -= uy * k; zz -= uz * k; zl = hyp(zx, zy, zz) || 1; }
  zx /= zl; zy /= zl; zz /= zl; const xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
  d[o] = xx * rx; d[o + 1] = xy * rx; d[o + 2] = xz * rx; d[o + 3] = 0; d[o + 4] = yx; d[o + 5] = yy; d[o + 6] = yz; d[o + 7] = 0;
  d[o + 8] = zx * rz; d[o + 9] = zy * rz; d[o + 10] = zz * rz; d[o + 11] = 0; d[o + 12] = ax; d[o + 13] = ay; d[o + 14] = az; d[o + 15] = 1;
  d[o + 16] = cr; d[o + 17] = cg; d[o + 18] = cb; d[o + 19] = mat; d[o + 20] = taper; d[o + 21] = q1; d[o + 22] = q2; d[o + 23] = q3;
}
// Sphère / ellipsoïde : centre, demi-axes (droite, haut, avant) portés par les vecteurs up (u) et avant (f).
function sphI(I, cx, cy, cz, rx, ry, rz, ux, uy, uz, fx, fy, fz, cr, cg, cb, mat, q1, q2, q3) {
  if (I.n >= I.maxN) return; const d = I.data, o = I.n++ * ISTR;
  const k = fx * ux + fy * uy + fz * uz; let zx = fx - ux * k, zy = fy - uy * k, zz = fz - uz * k; const zl = hyp(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
  const xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
  d[o] = xx * rx; d[o + 1] = xy * rx; d[o + 2] = xz * rx; d[o + 3] = 0; d[o + 4] = ux * ry; d[o + 5] = uy * ry; d[o + 6] = uz * ry; d[o + 7] = 0;
  d[o + 8] = zx * rz; d[o + 9] = zy * rz; d[o + 10] = zz * rz; d[o + 11] = 0; d[o + 12] = cx; d[o + 13] = cy; d[o + 14] = cz; d[o + 15] = 1;
  d[o + 16] = cr; d[o + 17] = cg; d[o + 18] = cb; d[o + 19] = mat; d[o + 20] = 1; d[o + 21] = q1; d[o + 22] = q2; d[o + 23] = q3;
}
// Maillage statique : position 3, normale 3, couleur 3, uv 2, matériau 1.
const SSTR = 12;
function mkStatic(arr, dynamic) {
  const vao = gl.createVertexArray(), vb = gl.createBuffer(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, arr, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
  const sz = [3, 3, 3, 2, 1]; let off = 0; for (let i = 0; i < 5; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, sz[i], gl.FLOAT, false, SSTR * 4, off); off += sz[i] * 4; }
  gl.bindVertexArray(null); return { vao, vb, n: arr.length / SSTR, data: arr };
}
function mkTex(src, mip) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  if (mip) gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const af = gl.getExtension('EXT_texture_filter_anisotropic'); if (af && mip) gl.texParameterf(gl.TEXTURE_2D, af.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  return t;
}
