# Addenda de rééquilibrage — 2026-11-06 (America/Toronto)

La spec du 2026-11-06 reste le document approuvé. Cet addenda note les changements ensuite autorisés : le coût du forage, les ressources de départ, un dépannage unique en surface, et, le 2026-11-07 (America/Toronto), la consommation du propulseur. Aucun prix, aucun score, aucun danger et aucune amélioration n’est modifié. La taille du réservoir, la vitesse du propulseur et la formule de chute ne font pas partie de cette autorisation.

## Mesures qui motivent le forage à 1

Dans Chrome, graine 42 puis 7 : un puits droit de 18 tuiles coûte **exactement 2 carburant par tuile** avec l’ancienne valeur, et la remontée au propulseur coûte **environ 0,73 par tuile** (13,2 de carburant pour 18 tuiles). Une chute libre d’environ 16 tuiles dans ce puits fait passer la coque de 100 à 57. Des impulsions de propulseur de 32 ms ne donnent pas une descente contrôlée : la foreuse remonte et brûle du carburant.

Le bot qui refuse toute chute de plus de 6 tuiles (il décale le puits) obtient, avec le forage à 2 :

- graines 1001–1020 : **0/20** victoires
- profondeur max typique 17–91
- carburant brûlé supérieur aux minerais vendus sur chaque graine

Avec le forage à **1** et 50 crédits, le même bot, graines 1001–1020 : **0/20**. Profondeur max moyenne 99,1 (de 20 à 120). Marge moyenne vendu − brûlé = −89,4. Seule la graine 1008 est positive (+169,1) ; elle achète Réservoir+ et Mèche II, puis s’arrête avec 86,8 de carburant. La montée depuis la rangée 195 coûte 0,75 × 195 = 146,25, pour un réservoir de 160 après Réservoir+.

Les crédits de départ font partie de l’autorisation. L’essai isolé 50 → 150 est plus bas. Il ne gagne pas. Les crédits sont remis à 50.

## Tableau

| Paramètre | Spec du 6 nov. | Après addenda | Raison |
|---|---|---|---|
| Carburant par tuile forée | 2 | **1** | À 2, chaque voyage mesuré brûle plus que la cargaison ramenée avant l’or. |
| Crédits de départ | 50 | **50, après un essai à 150** | 150 : encore 0/20, marge moyenne −122,8 au lieu de −89,4. Remis à 50. |
| Propulseur | 3/s à 4 tuiles/s (0,75/tuile) | **2,4/s à 4 tuiles/s (0,6/tuile)** | Autorisé le 2026-11-07. Vitesse, réservoir et dégâts inchangés. |
| Prix, score, chaleur, gaz, chutes, améliorations, réservoir | spec | spec | Pas dans cette autorisation. |

## Propulseur à 2,4 — autorisé le 2026-11-07 (Toronto)

Pascal autorise Arcade 2 à tester une consommation du propulseur de 2,4 au lieu de 3 carburants par seconde, sans modifier la vitesse (4 tuiles/s), le réservoir (100, puis 160 avec Réservoir+), ni les dégâts. Le coût par tuile montée est dérivé : 2,4 / 4 = **0,6**. Il n’est pas écrit en dur dans le bot. Les crédits de départ restent 50. Le forage reste à 1. Le dépannage unique reste inchangé.

Mesure du 2026-11-07 : montée Chrome 0,600 par tuile contre 0,6 prédits. Bots base et prudent, graines 1001–1020 : **0/20** dans les deux cas. La marge moyenne passe de −89,4 à +36,1 (base) et de +57,2 à +305 (prudent). La cible 18/20 n’est pas atteinte. Le détail est dans `docs/validation.md`. Aucun autre paramètre de jeu n’est changé pour forcer ce résultat.

## Dépannage du Poste

Une fois par mine, au Poste seulement, si le carburant est sous 20 et les crédits sous 40 : le carburant est porté à 40.

- Aucun crédit créé. `sold` et le score ne bougent pas.
- Inutilisable sous terre, pendant l’entraînement, ou une deuxième fois.
- Ne téléporte pas la foreuse et ne ramène pas le Cœur. Le retour du Cœur reste à piloter.
