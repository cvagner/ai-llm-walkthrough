// Aire de jeu : cotes du Livret de l'arbitrage (règle 1) et repères tactiques.
const HALF_L = 20, HALF_W = 10;          // 40 × 20 m
const GOAL_W = 3, GOAL_H = 2, POST = 0.08; // but 3 × 2 m intérieur, montants de 8 cm
const R6 = 6, R9 = 9, D7 = 7, D4 = 4;      // surface de but, jet franc, 7 m, limitation du gardien
const BALL_R = 0.094;                      // taille 3 : 58 à 60 cm de circonférence
// Repère d'attaque : u = distance à la ligne de sortie de but visée, w = écart latéral (w > 0 : à droite de l'attaquant).
// dir = +1 si l'équipe attaque vers +x. x = dir·(20 − u), z = dir·w.
function zoneDist(u, w) { const dz = abs(w) - 1.5; return dz > 0 ? hyp(u, dz) : u; }
function zoneDistXZ(x, z, dir) { return zoneDist(HALF_L - dir * x, z); }
// Point de la courbe située à d mètres du but (même forme que la ligne des 6 m), paramétré par t ∈ [−1, 1].
const _ap = new Float32Array(2);
function arcPoint(t, d) {
  const L = PI * d + 3, s = clamp(t, -1, 1) * L / 2, as = abs(s);
  if (as <= 1.5) { _ap[0] = d; _ap[1] = s; } else { const a = (as - 1.5) / d; _ap[0] = d * cos(a); _ap[1] = (s < 0 ? -1 : 1) * (1.5 + d * sin(a)); }
  return _ap;
}
function arcT(u, w, d) {
  const aw = abs(w); let s;
  if (aw <= 1.5) s = aw; else s = 1.5 + d * Math.atan2(aw - 1.5, max(u, 0.01));
  return clamp((w < 0 ? -s : s) / ((PI * d + 3) / 2), -1, 1);
}
// Postes.
const GB = 0, ALG = 1, ARG = 2, DC = 3, ARD = 4, ALD = 5, PVT = 6;
const ROLE = ['GB', 'ALG', 'ARG', 'DC', 'ARD', 'ALD', 'PVT'];
const ROLE_NAME = ['gardien', 'ailier gauche', 'arrière gauche', 'demi-centre', 'arrière droit', 'ailier droit', 'pivot'];
// Placement de base en attaque placée (u, w).
const ATK_BASE = [[0, 0], [1.6, -9.2], [10.8, -6.3], [11.8, 0], [10.8, 6.3], [1.6, 9.2], [6.75, 0.7]];
// Rang défensif (de la gauche de l'attaque vers sa droite) tenu par chaque poste : l'ailier droit défend sur l'ailier gauche adverse.
const DEF_SLOT = [-1, 5, 4, 3, 1, 0, 2];
// Systèmes défensifs : pour chaque rang, [t sur l'arc, distance au but].
const DEF_SYS = {
  '0-6': [[-0.86, 6.35], [-0.52, 6.5], [-0.17, 6.6], [0.17, 6.6], [0.52, 6.5], [0.86, 6.35]],
  '1-5': [[-0.84, 6.35], [-0.45, 6.5], [0.0, 6.6], [0.0, 9.6], [0.45, 6.5], [0.84, 6.35]],
  '3-2-1': [[-0.74, 6.4], [-0.36, 8.3], [0.0, 6.6], [0.0, 10.8], [0.36, 8.3], [0.74, 6.4]],
};
const DEF_NAMES = ['0-6', '1-5', '3-2-1'];
