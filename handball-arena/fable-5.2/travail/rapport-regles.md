# Tests de règles et de commandes

| Test | Règle | Résultat | Détail |
|---|---|---|---|
| Quatrième pas sans dribble | 7.3 | réussi | sifflé à t=1.12s, jet franc pour l'adversaire |
| Course en dribble | 7.4 | réussi | ni marcher ni 3 secondes en 2,5 s de dribble |
| Reprise de dribble | 7.7 | réussi | sifflée, jet franc adverse |
| Ballon gardé plus de 3 secondes | 7.2 | réussi | sifflé |
| Attaquant au sol dans la surface de but avec le ballon | 6.2 | réussi | renvoi pour le gardien adverse |
| Défenseur qui défend dans sa surface de but | 8.7f / 14.1 | réussi | jet de 7 m |
| Jet de 7 m : placements | 14.3 à 14.9 | réussi | tireur à 7.31 m, gardien à 3.24 m, joueur le plus proche du but à 9.47 m |
| Jet franc : lieu et distance des défenseurs | 13.6 à 13.8 | réussi | lieu à 9.08 m du but, défenseur avancé le plus proche à — |
| Jeu passif | 7.11 et 7.12 | réussi | avertissement : true, passes reçues après le geste : 5, jet franc adverse : true |
| Exclusion de 2 minutes | 16.3 et 16.5 | réussi | équipe réduite (5 joueurs de champ au plus bas) pendant 120.0 s de jeu |
| Engagement après but | 10.1 à 10.3 | réussi | engagement par l'équipe qui a encaissé, exécutant à 0.35 m du centre, équipe dans son camp : true |
| Ballon sorti en touche | 11.1 | réussi | remise en jeu pour l'adversaire du dernier joueur à avoir touché le ballon |
| But : ballon entièrement dans le but | 9.1 | réussi | but accordé |
| Montant | 1.2 | réussi | le ballon rebondit sur le montant |
| Temps mort d'équipe | 2.10 | réussi | accordé à l'équipe en possession : true, refusé à l'adversaire : true, reprise par jet franc : true, troisième de la mi-temps refusé : true |
| Ralenti rejoué après un but | cahier des charges | réussi | enregistrement de 240 images, ralenti de 394 images, état de la simulation identique après le ralenti : true |
| Gabarits par poste | demande | réussi | ailiers 1.75-1.84 m, arrières et demi-centres 1.87-1.93 m, pivots 1.91 et 1.88 m (carrure 1.23 contre 1.05) |
| Jeu placé sans longue passe, avec temps forts | demande | réussi | 296 passes, 0 par-dessus un voisin en jeu placé, 35 temps forts déclenchés |
| Se déplacer (Q / gauche) | commande | réussi | x 8.20 → 7.33 |
| Se déplacer (Z / haut) | commande | réussi | z 0.00 → -0.87 |
| Passer (Espace) | commande | réussi | passe déclenchée |
| Dribbler (Maj) | commande | réussi | dribble en cours |
| Armer et tirer (J) | commande | réussi | force 0.52, tir déclenché |
| Choisir le geste (7 : lob) | commande | réussi | le tir déclenché est un lob |
| Annoncer l'espagnole (E) | commande | réussi |  |
| Annoncer yago (Y) | commande | réussi |  |
| Kung-fu (G) | commande | réussi | passe en l'air, réception et tir avant de retomber |
| Feinte (H) | commande | réussi |  |
| Changer de défenseur (F) | commande | réussi | joueur 3 → 6 |
| Contrer (Espace) | commande | réussi | saut bras levés |
| Changer de système défensif (V) | commande | réussi |  |
| Changer de caméra (C) | commande | réussi |  |

32 réussis sur 32.
