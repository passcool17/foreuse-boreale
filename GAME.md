# Foreuse Boréale — comment y jouer

Prototype du 7 novembre 2026. On peut jouer. L’équilibre n’est pas final : le coût pour ramener le Cœur n’a pas atteint la cible de validation (18 mines sur 20). Les prix, le score et les règles ci-dessous sont ceux en cours, pas une promesse que chaque mine est gagnable.

Tu pilotes une foreuse à chenilles, vue de côté, dans une mine nouvelle à chaque partie. Le but est de ramener le **Cœur boréal** au Poste. Le temps affiché est informatif : il n’entre pas dans le score, et il n’y a pas de limite.

## Contrôles

| Action | Clavier | Écran |
|---|---|---|
| Rouler et forer à gauche ou à droite | A/D ou flèches | boutons ◀ ▶ |
| Forer vers le bas | S ou flèche bas, **maintenu** | bouton ▼ |
| Propulseur (monter) | W, flèche haut ou Espace | Propulseur |
| Sonder | R | Sonder |
| Pause et carte | Échap ou P | Pause |
| Son | M | Son |

Relâcher une direction met le forage en pause sans perdre l’avancement de la tuile. Un doigt qui quitte un bouton, un appel, ou un changement d’onglet relâche tout et met la partie en pause. On ne fore jamais vers le haut.

La pause fige la mine. La carte connue se fait défiler pour préparer la prochaine descente.

## Jauge

- **Carburant** 100. Le propulseur brûle 2,4 par seconde à 4 tuiles/s (0,6 par tuile), les chenilles 1, et seulement le plus gros débit. Immobile : 0. Une tuile forée coûte 1. À 0, les chenilles tombent à 30 % et le propulseur se coupe.
- **Réserve de retour** : estimation prudente, 3 × la profondeur × 1,25. Elle passe à l’orange quand le carburant descend sous ce nombre. Ce n’est pas une garantie : un détour ou un bloc peuvent coûter plus cher.
- **Coque** 100. Un bloc qui frappe à plus de 3 tuiles/s enlève 15. Une explosion de gaz enlève 20. Une chute enlève 5 par tuile au-delà de 6. Sous la rangée 150, sans Isolation, la chaleur enlève 1 toutes les 2 secondes.
- **Soute** 10 pépites. Pleine, on ne ramasse plus. Le Cœur occupe un emplacement à part.
- **Crédits** de départ : 50.

## Lire le terrain

Les strates changent de couleur : tourbe, argile, granite, glace ancienne. La roche fissurée peut tomber si tu lui retires son soutien : elle tremble 2 secondes, puis elle tombe. Le gaz montre des bulles quand tu t’approches, siffle 2 secondes, puis explose : tu as le temps de reculer. Sonder (3 de carburant, foreuse immobile) révèle 8 tuiles sous toi. Rien de dangereux n’arrive sans signe.

## Poste et Atelier

Au retour sur le quai du Poste (les côtés de la bouche du puits), la soute se vend **une seule fois** par arrivée. Après avoir creusé, il faut se décaler sur le quai : le propulseur se dirige aussi sur les côtés. Il faut quitter le Poste et y revenir pour vendre de nouveau. L’Atelier fige la physique : plein (1 crédit par unité), réparation (2 crédits par point), et cinq améliorations uniques.

| Achat | Coût | Effet |
|---|---|---|
| Réservoir+ | 120 | carburant max 160, jauge pleine |
| Soute+ | 150 | soute de 18 |
| Mèche II | 250 | roche dure, forage 30 % plus rapide |
| Blindage | 200 | coque max 160, jauge pleine |
| Isolation | 300 | plus de dégâts de chaleur |

Cuivre 10, argent 25, or 60, cristal boréal 150.

Forer une tuile coûte **1** de carburant. Le propulseur coûte **2,4** par seconde depuis le 2026-11-07 (Toronto) ; il monte toujours à 4 tuiles/s. Le réservoir, les chutes, le plein, les prix et le score ne changent pas.

## Dépannage, une seule fois

Si tu es au Poste avec moins de 20 de carburant et moins de 40 crédits, l’Atelier propose un dépannage : le carburant monte à 40. Ça ne donne pas de crédits, ça n’entre pas dans le score, et ça ne ramène pas le Cœur. Le bouton disparaît ensuite. On ne peut pas le refaire dans la même mine.

## Remorquage et fins

Sous la surface, le remorquage coûte 50 crédits, vide la soute et renvoie le Cœur à sa place. Sans 50 crédits, c’est la défaite. La coque à 0 est aussi une défaite. Abandonner termine la partie.

- **Victoire** (Cœur au Poste) : minerais vendus + 500 − 25 par remorquage.
- **Défaite ou abandon** : minerais vendus. Le temps n’est pas compté.

L’écran de fin propose de rejouer la même mine ou d’en générer une nouvelle. L’entraînement n’inscrit aucun record. Seuls le son, le volume, l’entraînement terminé et le meilleur score d’une partie normale restent sur l’appareil.
