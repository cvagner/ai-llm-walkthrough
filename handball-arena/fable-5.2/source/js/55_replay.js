/* Ralenti rejoué : les 4 dernières secondes de jeu sont enregistrées (positions des articulations et du ballon),
   puis rejouées au ralenti après un but, sans toucher à la simulation. Tampons préalloués. */
const REC_N = 240, REC_PJ = NJ * 3, REC_PM = 6, REC_BM = 8;
const REC = { i: 0, count: 0, goal: -1, J: new Float32Array(REC_N * 16 * REC_PJ), M: new Float32Array(REC_N * 16 * REC_PM), B: new Float32Array(REC_N * REC_BM),
  sJ: new Float32Array(16 * REC_PJ), sM: new Float64Array(16 * REC_PM), sB: new Float64Array(REC_BM) }; /* sauvegarde en double précision : l'état est rendu à l'identique */
function snapWrite(J, M, B, f) {
  for (let i = 0; i < 16; i++) { const p = S.P[i], o = (f * 16 + i) * REC_PM; J.set(p.J, (f * 16 + i) * REC_PJ); M[o] = p.x; M[o + 1] = p.y; M[o + 2] = p.z; M[o + 3] = p.hdx; M[o + 4] = p.hdz; M[o + 5] = p.drib ? 1 : 0; }
  const b = S.ball, o = f * REC_BM; B[o] = b.x; B[o + 1] = b.y; B[o + 2] = b.z; B[o + 3] = b.rot; B[o + 4] = b.vx; B[o + 5] = b.vz; B[o + 6] = b.state; B[o + 7] = b.holder;
}
function snapRead(J, M, B, f) {
  for (let i = 0; i < 16; i++) { const p = S.P[i], o = (f * 16 + i) * REC_PM, j = (f * 16 + i) * REC_PJ; for (let k = 0; k < REC_PJ; k++) p.J[k] = J[j + k]; p.x = M[o]; p.y = M[o + 1]; p.z = M[o + 2]; p.hdx = M[o + 3]; p.hdz = M[o + 4]; p.drib = M[o + 5] > 0.5; }
  const b = S.ball, o = f * REC_BM; b.x = B[o]; b.y = B[o + 1]; b.z = B[o + 2]; b.rot = B[o + 3]; b.vx = B[o + 4]; b.vz = B[o + 5]; b.state = B[o + 6]; b.holder = B[o + 7];
}
function recFrame() { snapWrite(REC.J, REC.M, REC.B, REC.i); REC.i = (REC.i + 1) % REC_N; if (REC.count < REC_N) REC.count++; if (REC.goal >= 0) REC.goal++; }
/* Lecture : UI.replay = { k, end } en images depuis le plus ancien enregistrement. */
function replayStart() {
  if (REC.count < 90 || REC.goal < 0) return false; snapWrite(REC.sJ, REC.sM, REC.sB, 0);
  const last = REC.count - 1, g = last - REC.goal; UI.replay = { k: max(0, g - 110), end: min(last, g + 40), goalK: g, side: S.netS }; REC.goal = -1; return true;
}
function replayFrame(dt) {
  const r = UI.replay, f = Math.floor(r.k), idx = (REC.i - REC.count + f + REC_N * 2) % REC_N; snapRead(REC.J, REC.M, REC.B, idx);
  const b = S.ball, c = R.cam, a = (r.k - r.goalK) * 0.006, gx = r.side * HALF_L; /* caméra rapprochée, côté but, qui tourne lentement */
  c.tx += (lerp(b.x, gx, 0.35) - c.tx) * 0.15; c.ty += (1.2 - c.ty) * 0.15; c.tz += (b.z * 0.6 - c.tz) * 0.15;
  c.x = gx - r.side * (9.5 + 2 * cos(a)); c.y = 2.6; c.z = 6.5 + 3 * sin(a) + b.z * 0.2; c.fov = 0.62;
  r.k += dt * 60 * 0.38; return r.k >= r.end;
}
function replayEnd() { if (!UI.replay) return; snapRead(REC.sJ, REC.sM, REC.sB, 0); UI.replay = null; camFixed = false; updateCam(0, true); $('combo').className = ''; }
