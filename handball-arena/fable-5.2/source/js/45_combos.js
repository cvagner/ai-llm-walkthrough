// Combinaisons d'attaque placée, décrites en données dans le repère d'attaque (u = distance au but, w = latéral, w < 0 à gauche).
// Chaque étape : by = poste qui porte le ballon, mv = courses, t = délai avant l'action, to = passe à ce poste, sh = tir de ce type.
// Sources : fiches de reference/combinaisons/fiches (f196 et variantes, f703) et captures de reference/combinaisons/yago.
const COMBOS = [
  {
    k: 'espagnole', n: "L'espagnole (croisé central)", start: DC, src: 'fiche f196',
    // Le demi-centre court sur le 2e défenseur et fait écran ; l'ailier croise dans son dos vers le centre, l'arrière court en parallèle un couloir plus loin.
    // hold : le porteur attend que le partenaire ait fait sa course avant de donner
    variants: [
      { n: "l'ailier croise, l'arrière tire", steps: [
        { by: DC, t: 1.5, hold: 1, to: ALG, mv: { [DC]: [8.4, -3.4], [ALG]: [10.2, -4.2], [ARG]: [10.8, -0.6], [ARD]: [10.4, 5.4] } },
        { by: ALG, t: 0.55, to: ARG, mv: { [DC]: [8.1, -3.5], [ALG]: [9.4, -1.6], [ARG]: [9.8, 1.2], [ARD]: [10.8, 6.4] } },
        { by: ARG, t: 0.6, sh: SH_SUSP, mv: { [DC]: [8.1, -3.5], [ARG]: [7.0, 1.6], [ALG]: [9.6, -1.0], [ARD]: [9.6, 5.0] } }] },
      { n: "l'arrière croise et tire", steps: [
        { by: DC, t: 1.1, hold: 1, to: ARG, mv: { [DC]: [8.2, -3.8], [ARG]: [10.4, -3.0], [ALG]: [10.4, -6.6], [ARD]: [10.4, 4.6] } },
        { by: ARG, t: 0.8, sh: SH_SUSP, mv: { [DC]: [8.0, -3.8], [ARG]: [7.4, 0.2], [ALG]: [9.6, -4.4], [ARD]: [9.8, 3.8] } }] },
      { n: "l'ailier croise et tire", steps: [
        { by: DC, t: 1.5, hold: 1, to: ALG, mv: { [DC]: [8.4, -3.4], [ALG]: [10.2, -4.2], [ARG]: [11.6, -1.6] } },
        { by: ALG, t: 0.85, sh: SH_SUSP, mv: { [DC]: [8.1, -3.5], [ALG]: [7.6, -0.8], [ARG]: [9.4, 2.0] } }] },
      { n: 'le demi-centre tire', steps: [
        { by: DC, t: 0.85, sh: SH_SUSP, mv: { [DC]: [7.8, -2.6], [ALG]: [10.4, -5.0], [ARG]: [11.0, -2.0] } }] },
    ],
  },
  {
    k: 'yago', n: 'Yago', start: DC, src: 'captures de match',
    // Le demi-centre donne et rentre en second pivot à l'opposé ; le pivot bloque le 2e défenseur ; l'arrière lancé attaque l'intervalle 1-2, fixe le défenseur de l'aile et décale l'ailier.
    variants: [
      /* lecture capture par capture (critique du tour 15) : le demi-centre donne à l'arrière droit et entre en second pivot de ce côté,
         le pivot ressort en arrière gauche, le ballon est renversé par l'axe jusqu'à l'ailier gauche */
      { n: "renversement : entrée à droite, tir de l'ailier gauche", steps: [
        { by: DC, t: 0.55, to: ARD, mv: { [DC]: [10.6, 2.0], [ARD]: [10.8, 6.0], [ARG]: [11.2, -2.4], [PVT]: [8.6, -3.6], [ALG]: [1.7, -9.2] } },
        { by: ARD, t: 0.75, hold: 1, to: ARG, mv: { [ARD]: [9.6, 5.4], [DC]: [6.8, 3.2], [ARG]: [10.6, -0.8], [PVT]: [9.8, -5.6], [ALG]: [1.7, -9.2] } },
        { by: ARG, t: 0.85, to: PVT, mv: { [ARG]: [7.9, -2.0], [DC]: [6.8, 3.2], [PVT]: [9.0, -6.0], [ALG]: [2.0, -9.0], [ARD]: [10.2, 5.6] } },
        { by: PVT, t: 0.4, to: ALG, mv: { [PVT]: [7.9, -6.4], [ARG]: [7.9, -2.0], [DC]: [6.8, 3.2], [ALG]: [2.3, -8.8] } },
        { by: ALG, t: 0.06, sh: SH_AILIER, mv: { [ALG]: [2.8, -8.2], [DC]: [6.8, 3.2] } }] },
      { n: "l'arrière fixe et décale l'ailier", steps: [
        { by: DC, t: 0.50, to: ARG, mv: { [DC]: [10.4, 1.4], [ARG]: [11.4, -3.6], [PVT]: [7.0, -2.6], [ALG]: [1.7, -9.2], [ARD]: [10.4, 5.6] } },
        { by: ARG, t: 1.0, to: ALG, mv: { [ARG]: [7.5, -5.8], [DC]: [6.8, 2.4], [PVT]: [6.9, -3.8], [ALG]: [2.2, -8.9], [ARD]: [9.6, 4.8] } },
        { by: ALG, t: 0.06, sh: SH_AILIER, mv: { [ALG]: [2.8, -8.2], [DC]: [6.8, 2.4], [PVT]: [6.9, -3.8] } }] },
      { n: "relais au pivot, tir en plongeant", steps: [
        { by: DC, t: 0.50, to: ARG, mv: { [DC]: [10.4, 1.4], [ARG]: [11.4, -3.6], [PVT]: [7.0, -2.6], [ARD]: [10.4, 5.6] } },
        { by: ARG, t: 1.0, hold: 1, to: PVT, mv: { [ARG]: [8.2, -5.2], [DC]: [6.8, 2.4], [PVT]: [6.8, -2.2], [ALG]: [2.2, -8.9], [ARD]: [9.6, 4.8] } },
        { by: PVT, t: 0.12, sh: SH_PLONG, mv: { [PVT]: [6.8, -2.2], [DC]: [6.8, 2.4] } }] },
      { n: "l'arrière tire derrière le bloc", steps: [
        { by: DC, t: 0.50, to: ARG, mv: { [DC]: [10.4, 1.4], [ARG]: [11.4, -3.6], [PVT]: [7.0, -2.6], [ARD]: [10.4, 5.6] } },
        { by: ARG, t: 0.9, sh: SH_SUSP, mv: { [ARG]: [7.8, -4.6], [DC]: [6.8, 2.4], [PVT]: [6.9, -3.4], [ARD]: [9.6, 4.8] } }] },
    ],
  },
  {
    k: 'croise-ar-al', n: 'Croisé arrière-ailier', start: ARD, src: 'fiche f703',
    variants: [
      { n: "passe à l'opposé, l'arrière gauche tire", steps: [
        { by: ARD, t: 1.6, to: ALD, mv: { [ARD]: [7.2, 7.2], [ALD]: [11.6, 6.4], [ARG]: [12.4, -6.0], [DC]: [12.2, 0.4] } },
        { by: ALD, t: 0.80, to: ARG, mv: { [ALD]: [9.6, 1.4], [ARD]: [3.0, 9.0], [ARG]: [8.4, -2.0], [DC]: [12.4, 1.0] } },
        { by: ARG, t: 0.12, sh: SH_SUSP, mv: { [ARG]: [7.6, -1.6], [ALD]: [9.6, 1.4], [ARD]: [1.8, 9.2], [DC]: [12.4, 1.0] } }] },
    ],
  },
];
