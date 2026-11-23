# Tour 17 — critiques handball et démarche

Rendus jugés : dossiers `handball/` et `demarche/`. Pas de critique visuel à ce tour.

## Handball : 2 graves, 8 moyens, 4 mineurs — non passé

Graves :

- **Tir d'ailier à l'entraînement** : l'ailier bute sur son défenseur et ne prend pas son couloir.
- **Espagnole, variante 1** : le tir final est contré ou n'apparaît pas ; l'écran ne libère pas le tireur.

Moyens (résumé) : les fixations du temps fort n'attirent pas le défenseur voisin, qui reste sur son joueur ; contacts encore raides en duel ; tireur des combinaisons qui tire trop tard, au contact.

Jugé correct : passes de voisin à voisin, changement de rythme entre temps faible et temps fort.

## Démarche : 3 graves, 8 moyens, 1 mineur — non passé

Graves :

- **Pas chassés** : haut du corps figé.
- **Pas chassés** : pieds qui glissent au sol.
- **Après une interception** : pose de mannequin pendant un instant.

Jugé correct : course de repli, avec une vraie phase de suspension.

## Corrigé après ce tour, non rejugé

- Combinaisons : le tireur final tire en suspension avant le contact (`51_ai.js`, condition `hot`). Traces (`trace-combo.mjs`) : espagnole variantes 1 à 3 et croisé arrière-ailier se terminent par un tir (but ou arrêt).
- Entraînement au tir d'ailier : le défenseur d'aile est resserré vers l'intérieur, le couloir est ouvert.
- Temps fort : le porteur donne un peu plus tôt (défenseur à 1,8 m au lieu de 1,5 m).
- Pas chassés : le buste accompagne chaque appui (roulis, vrille, flexion), les bras de garde oscillent, pied levé plus haut, descente du bassin moins marquée (`40_player.js`).

Non traité : glissement des pieds en pas chassés, pose figée après interception, défenseur voisin qui ne vient pas sur la fixation (écarté : ne pas rééquilibrer la défense face au temps fort). Yago non modifié, à la demande.

Rendus de l'état après corrections : `travail/critique/tour18/` (non jugés).
