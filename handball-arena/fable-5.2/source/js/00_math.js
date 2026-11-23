// Mathématiques de base, sans allocation dans les fonctions appelées à chaque image.
const PI = Math.PI, TAU = PI * 2, G = 9.81;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = sat(t); return t * t * (3 - 2 * t); };
const hyp = Math.hypot, abs = Math.abs, sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, min = Math.min, max = Math.max;
function angDiff(a, b) { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; }
// Générateur déterministe (mulberry32) : même graine, même match.
let _seed = 20261118;
function srand(s) { _seed = s >>> 0; }
function rnd() { _seed = (_seed + 0x6D2B79F5) >>> 0; let t = _seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function rndN() { return (rnd() + rnd() + rnd() + rnd() - 2) * 0.866; } // proche d'une gaussienne, écart-type ≈ 0,5
// Hachage indépendant de la simulation (décor, public).
function hash1(n) { const x = sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const m4 = () => new Float32Array(16);
const _mt = new Float32Array(16);
function m4mul(o, a, b) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    _mt[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3; _mt[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    _mt[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3; _mt[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  o.set(_mt); return o;
}
function m4persp(o, fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; }
function m4ortho(o, l, r, b, t, n, f) { o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; }
function m4look(o, ex, ey, ez, tx, ty, tz, ux, uy, uz) {
  let zx = ex - tx, zy = ey - ty, zz = ez - tz, l = 1 / hyp(zx, zy, zz); zx *= l; zy *= l; zz *= l;
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx; l = 1 / hyp(xx, xy, xz); xx *= l; xy *= l; xz *= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
  o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1; return o;
}
// Cinématique inverse à deux os : écrit l'articulation intermédiaire dans out[o..o+2].
function ik2(out, o, ax, ay, az, tx, ty, tz, l1, l2, hx, hy, hz) {
  let dx = tx - ax, dy = ty - ay, dz = tz - az, d = hyp(dx, dy, dz);
  if (d < 0.02) { d = 0.02; dx = 0.02; dy = 0; dz = 0; }
  const dm = l1 + l2 - 0.002, dc = d > dm ? dm : d, inv = 1 / d; dx *= inv; dy *= inv; dz *= inv;
  const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc), h2 = l1 * l1 - a * a, h = h2 > 0 ? sqrt(h2) : 0;
  const k = hx * dx + hy * dy + hz * dz; let px = hx - dx * k, py = hy - dy * k, pz = hz - dz * k, pl = hyp(px, py, pz);
  if (pl < 1e-4) { px = 0; py = -1; pz = 0; pl = 1; } pl = 1 / pl;
  out[o] = ax + dx * a + px * pl * h; out[o + 1] = ay + dy * a + py * pl * h; out[o + 2] = az + dz * a + pz * pl * h;
  return dc / d; // < 1 si la cible est hors de portée
}
