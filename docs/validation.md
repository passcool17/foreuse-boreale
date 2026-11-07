# Validation — prototype du 2026-11-07

Machine : VM Linux, Node v22.23.4, Chrome headless `/usr/bin/google-chrome`. Ce n’est pas le téléphone de Pascal et ce n’est pas un ordinateur de jeu. Les chiffres ci-dessous sont ceux réellement obtenus.

## Tests automatisés

`npm test` → **115 tests, 0 échec** (environ 0,5 s).

Couvert : RNG, 50 graines + 100 graines d’intégration, carburant (un seul débit, forage sans roulement, immobile à 0), soute et Cœur, chutes, économie, vente unique, score sans vitesse, remorquage, pause de l’horloge, effondrement après 2,0 s, soutien latéral, plafond 12, re-figement qui n’enferme pas, pépites (6 s, plafond 40), gaz, chaleur, sondage, entrées, préférences sans clé de partie, pas fixe 60 Hz (4 sous-pas), entraînement, silence audio.

`npm run sweep` → **`OK 1000/1000`**. Chaque graine 1…1000 a : bordures en roc-mère, surface vide, Cœur atteignable avec la Mèche II, au moins 80 % de la valeur minerai atteignable, au moins 6 cuivres et 2 argents dans les rangées 1–30, aucune roche dure dans ces rangées, deux descentes vers la rangée 100, pas de gaz dans le puits ni dans les rangées 1–10, roche fissurée soutenue à la génération. La même graine redonne la même grille. Ce n’est pas une preuve que la victoire est finançable.

## Faisabilité économique — non une preuve

`npm run feasibility` sur les graines 1001…1020, **0/20 victoires**.

Le bot joue sur la grille, sans Matter. Coût du plan : 2 carburant par tuile forée, 0,75 en montée, et 1 par tuile horizontale vide (`FB_HORIZ=1`). Une variante au débit réel des chenilles (1/3 par tuile, puisque 1/s à 3 tuiles/s) donne aussi **0/20**. Le bot achète d’abord le Réservoir+, essaie d’épargner pour la Mèche II, et s’arrête en surface, réservoir parfois acheté, crédits épuisés en carburant, Cœur non ramené. Le cœur de chaque graine est pourtant atteignable même sans Mèche II et sans forage vers le haut.

Ça suggère qu’un puits droit coûte cher (2 par tuile) par rapport au minerai peu profond. Ça ne démontre pas qu’une personne qui ne fore que les veines perd. **Les valeurs de la spec ne sont pas modifiées.** Si les essais de Pascal coincent avant la Mèche II, pistes possibles, non appliquées : baisser le coût d’une tuile (2) ou celui de la Mèche II (250), ou densifier le cuivre et l’argent du départ.

## Comportement réel dans Chrome

Graine 7, viewport 1280×800 :

- Menu en français, graine 7 proposée.
- Après « Jouer » : carburant 100, coque 100, crédits 50, profondeur 0.
- Flèche bas maintenue 1,8 s : carburant **96**, profondeur **2**, un puits visible. Deux tuiles × 2 carburant.
- Échap ouvre la pause ; la carte connue ne dessine que le terrain déjà vu.
- Atelier ouvert au Poste : `elapsed` est resté à **0,466… s** après 1,2 s d’horloge. La physique était gelée.
- Cibles tactiles mesurées en 390×844 : toutes **≥ 56 px** (croix 64×56, Propulseur 96×96, Sonder/Atelier/Pause/Son 82×56). Un tap sur Propulseur a fait passer le carburant de 100 à 99,9.

## Stabilité physique, 5 minutes

`?seed=7&debug=collapse`, Chrome headless, SwiftShader, 300 s d’horloge. Le mode lâche jusqu’à 12 blocs dans une cheminée.

| Mesure | Valeur observée |
|---|---|
| Positions non finies (`bad`) | **0** |
| Corps Matter | 1208 au début, **1184** à la fin (pas de fuite) |
| Maximum de corps | 1208 |
| Blocs suivis | 12, puis 0 après re-figement |
| IPS | 26 à 43, minimum retenu **26** |
| Temps simulé | 300,5 s, collé à l’horloge |
| Erreurs page | aucune |

26 IPS est le rendu logiciel de cette VM, pas un poste de bureau. Aucun corps éjecté hors nombres finis, aucun dépassement du plafond de 12 blocs. Le pas fixe jette le retard au-delà de 4 sous-pas.

## Rééquilibrage (forage à 1, crédits mesurés le 2026-11-06)

Addenda : `docs/superpowers/specs/2026-11-07-foreuse-boreale-balance-addendum.md`.

Moteur, puits droit, graine 42 : 18 tuiles forées à l’ancienne valeur font passer le carburant de 100 à 64 (exactement 2 par tuile). Remontée au propulseur : 63,9 → 50,7 sur 18 tuiles, soit **0,73 par tuile**. Chute libre ensuite : coque 100 → 57. Impulsions de 32 ms : la foreuse reste vers la profondeur 1–2 et brûle du carburant au lieu de descendre.

Bot sans chute de plus de 6 tuiles, sans téléportation, ventes et pleins réels :

| Forage | Graines | Victoires | Profondeur max observée |
|---|---|---|---|
| 2 (spec) | 1001–1020 | **0/20** | 17–91 |
| 1 (addenda) | 1001–1020 | **0/20** | 20–120 |

À 1 et 50 crédits, le carburant brûlé dépasse les ventes sur 19 graines. La graine 1008 vend 955 pour 785,9 brûlés et achète Réservoir+ et Mèche II, puis s’arrête. La cible 18/20 n’est pas atteinte. Les crédits de départ étaient autorisés : l’essai 150 est dans la section suivante. Le dépannage unique est une mise en place de bouton, pas une victoire.

## Crédits de départ 50 puis 150 (2026-11-06, Toronto)

Même bot, forage 1, ventes, pleins et achats par les fonctions du jeu. Aucun crédit ajouté dans le bot. Graines 1001–1020. La série 2001–2020 n’a pas été lancée : 18/20 est déjà manqué.

| | 50 | 150 |
|---|---:|---:|
| Victoires | 0/20 | 0/20 |
| Profondeur max moyenne | 99,1 | 104,1 |
| Plus grande profondeur | 120 | 120 |
| Graines rendues à y ≥ 150 | 0 | 0 |
| Marge moyenne (vendu − brûlé) | −89,4 | −122,8 |
| Graines à marge positive | 1 (1008, +169,1) | 0 |

Le supplément de 100 crédits augmente les ventes moyennes de 34 et le carburant brûlé de 68. La seule graine rentable à 50 (1008) devient déficitaire à 150 (−125,9) : l’argent part dans des trajets plus longs. 1004, coincée à la profondeur 20 avec 48 crédits à 50, va jusqu’à 107 à 150 et vend 990 pour 1083,5 brûlés. Ce n’est pas une amélioration utile. `START_CREDITS` est remis à **50**. La cible reste non atteinte. Aucune autre valeur de crédits n’a été essayée.

| Graine | y50 | vendu50 | brûlé50 | y150 | vendu150 | brûlé150 |
|---|---:|---:|---:|---:|---:|---:|
| 1001 | 111 | 1115 | 1196,8 | 111 | 1115 | 1196,8 |
| 1002 | 101 | 610 | 736,3 | 97 | 575 | 674,5 |
| 1003 | 101 | 845 | 937,3 | 101 | 845 | 949,8 |
| 1004 | 20 | 0 | 71,7 | 107 | 990 | 1083,5 |
| 1005 | 95 | 700 | 864,3 | 88 | 455 | 624,3 |
| 1006 | 72 | 550 | 600,5 | 66 | 450 | 565,9 |
| 1007 | 108 | 750 | 819,4 | 110 | 975 | 1140,7 |
| 1008 | 88 | 955 | 785,9 | 106 | 1050 | 1175,9 |
| 1009 | 99 | 825 | 971,5 | 94 | 485 | 616,3 |
| 1010 | 91 | 960 | 1067,7 | 107 | 1000 | 1166,4 |
| 1011 | 105 | 705 | 802,5 | 105 | 590 | 696,9 |
| 1012 | 109 | 745 | 825,8 | 114 | 1205 | 1307,3 |
| 1013 | 120 | 1135 | 1267,1 | 120 | 1165 | 1299,5 |
| 1014 | 114 | 1135 | 1279,7 | 104 | 885 | 1053,1 |
| 1015 | 119 | 1110 | 1257,6 | 119 | 1170 | 1268,3 |
| 1016 | 106 | 830 | 889,6 | 109 | 755 | 910,5 |
| 1017 | 107 | 895 | 960,1 | 107 | 930 | 1036,8 |
| 1018 | 109 | 860 | 1015,8 | 106 | 695 | 802,7 |
| 1019 | 93 | 785 | 854,9 | 96 | 860 | 982,9 |
| 1020 | 114 | 1035 | 1128,7 | 114 | 1035 | 1133,5 |

### Pilote du bot, règles inchangées

`FB_PILOT=1` ne change pas le jeu. Le bot ramasse aussi le cuivre, n’achète que le Réservoir+, et ne creuse plus vers le Cœur quand le trajet ne paie pas. Résultat à 50 crédits : encore **0/20**. Marge moyenne +57,2 (18 graines positives), profondeur moyenne 68,9, maximum 114. Dix-huit graines s’arrêtent au Poste avec le réservoir plein (160) et des crédits encore en caisse, parce que le prochain trajet ne couvre pas la remontée. La graine 1004 reste coincée à y=20, fuel 29, crédits 48, vendu 0 : même trace que le bot de base. Ce n’est pas un manque de crédits.

Le mur n’est donc pas seulement la politique du bot. Les premiers trajets peuvent être rentables. Aucune route payante mesurée n’atteint la rangée 195. Creuser le puits jusqu’au Cœur coûte au moins 195 de forage, et la remontée à vide coûte 146,25. Le réservoir après amélioration contient 160.

### Plus petit changement qui demanderait une nouvelle autorisation

Laisser 40 de marge dans le réservoir de 160 pour la remontée finale :

195 × taux + 40 ≤ 160, donc taux ≤ 120 / 195 = **0,615** de carburant par tuile.

À ce moment-là le propulseur brûlait 3 par seconde à 4 tuiles/s, soit 0,75 par tuile. Le plafond demandé était environ 2,46 par seconde. Pascal a autorisé **2,4** le 2026-11-07. La mesure est dans la section suivante.

Une chute de plus de 26 tuiles est mortelle (5 × (tuiles − 6) au-delà de 6). Le bot refuse déjà toute chute de plus de 6 et décale le puits. Autoriser une redescente sûre dans un puits déjà ouvert est un second levier, distinct, et il ne suffit pas : même un puits droit laisse seulement 160 − 146,25 = 13,75 pour tout le reste du dernier voyage.

### Bouton de dépannage

`?debug=rescue-setup&seed=7` place la foreuse au Poste, carburant 5, crédits 10, rien de vendu. Le message reste affiché : ce n’est pas une partie jouée. Clic souris sur **Accepter le dépannage**, bureau et 390 px de large. Après le clic : carburant 40, crédits 10, vendu 0, profondeur 0, toujours au Poste, bouton retiré, mention « déjà été utilisé ». Un plein ensuite, par le bouton, passe de 40 à 50 et de 10 crédits à 0, sans quitter le Poste. Pause : coque 100/100. L’atelier au départ (50 crédits, jauges pleines) montre Plein et Réparer désactivés, et les cinq améliorations avec leurs prix. La pépite forée sous un quai restait hors des 24 px tant que le quai flottait au-dessus de la case vide. Ce quai est retiré avec la tuile de soutien. La vente a ensuite été rejouée : voir la section du 7 novembre.

## Propulseur à 2,4 (2026-11-07, Toronto)

Seul changement de règle : `FUEL_THRUST` 3 → 2,4. Vitesse 4 tuiles/s. Coût dérivé : 2,4 / 4 = **0,6** par tuile, dans le bot (`CFG.FUEL_THRUST / CFG.THRUST_SPEED`) comme dans le moteur (`fuelDrain`). Réservoir 100 / 160, crédits 50, forage 1, chutes, gaz, chaleur, prix et score inchangés. Graines 2001–2020 non lancées : 18/20 est manqué.

Montée réelle dans Chrome, graine 7, puits du départ : 8 tuiles forées (carburant 100 → 92, soit 1 par tuile), puis propulseur seul. Dénivelé 7,803 tuiles, 4,680 de carburant, **0,600 par tuile** (prédiction 0,6). Coque restée à 100.

Boucle jouée, même graine, sans mise en place : rouler jusqu’au cuivre (colonne 22, rangée 1), forer, tomber d’une tuile dans la case, ramasser (soute 1), remonter au quai. Vente automatique : **10** crédits, soute 0, crédits 60, message « Vente : 10 crédits ». Plein ensuite : 1 crédit pour 1 carburant (98,00 → 99,00, crédits 60 → 59). Le bouton Réservoir+ à 120 reste désactivé ; un clic dessus ne débite rien. On ne facture plus une unité qui ne rentre pas dans le réservoir.

| Politique | Débit | Victoires | Profondeur moyenne | Marge moyenne | Graines à marge > 0 |
|---|---|---:|---:|---:|---:|
| Base | 3/s | 0/20 | 99,1 | −89,4 | 1 |
| Base | 2,4/s | 0/20 | 114,6 | +36,1 | 11 |
| Prudente | 3/s | 0/20 | 68,9 | +57,2 | 18 |
| Prudente | 2,4/s | 0/20 | 114,1 | +305,4 | 19 |

Le plafond de 4 000 pas, le même que les mesures d’avant, coupe 3 parties de base et 6 parties prudentes. Une reprise prudente à 12 000 pas reste à **0/20**. La plus grande profondeur devient 147 (graine 1008). Plusieurs parties rentrent au Poste avec le réservoir plein et des centaines de crédits : 1015 a 749 crédits et 159,9 de carburant, profondeur max 122. 1020, après 6 770 pas, s’arrête à la profondeur max 145 avec 331 crédits. 1004 reste `bloque` à y=20, vendu 0, dans les deux politiques : le retour estimé ne rejoint pas le chemin, ce n’est pas le nouveau débit.

La remontée depuis la rangée 195 coûte 0,6 × 195 = **117**, ce qui tient dans 160 avec 43 de marge. Le bot prudent refuse un tronçon de puits dont le minerai du voyage ne paie pas la remontée, même quand la caisse peut acheter le carburant. Le bot de base dépense le surplus dans la Mèche II, qui n’économise pas de carburant, puis s’arrête souvent sans crédits vers la rangée 115. Aucune des deux politiques n’ouvre le puits jusqu’au Cœur. Ce n’est pas une simulation Matter : le gaz est contourné, la chaleur est approchée par le temps de trajet, et une victoire de bot n’aurait pas été une partie jouée.

Prochaine mesure, sans nouveau changement de règle : un bot qui étage le puits par réservoir tant que la caisse paie le plein, au lieu d’exiger que chaque voyage soit rentable tout seul. Pas une demande de baisser encore le propulseur, ni d’agrandir le réservoir, tant que cette politique n’a pas été mesurée.

Mobile 390 px : le bouton droit déplace la foreuse, le relâchement l’arrête (colonne 21, puis toujours 21). Échap met en pause et la reprend. Un `blur` remet en pause. Le dépannage, affiché comme mise en place `?debug=rescue-setup`, passe de 5 à 40 de carburant, crédits 10, vendu 0, et un second clic ne donne rien.

## Plan du bot, 2026-11-07 (pas une preuve physique)

Graines 1001–1020, même règles (propulseur 2,4/s, forage 1, crédits 50, réservoir 160). **0/20.** La série 2001–2020 n’est pas lancée. Conservation des crédits : entrée = sortie sur les traces lues.

Le seul succès déjà tracé, avant le correctif du détour, est la graine **1012** : ventes 70, puis Réservoir+ (120, jauge 160), ventes 175, plein 123, ventes 515, Isolation 300, pleins, ventes 180 et 150. Fin : Cœur au Poste, vendu 1090, crédits 131, carburant 20,1, brûlé 827,4, coque 100. Le Cœur de cette graine est en x=6, pas au bout d’un long travers.

Graine **1004**, qui ne passe pas : Cœur en (36, 195), puits en x=20. La remontée de l’escalier coûte **133** pour un réservoir de **160**. Trace du plan actuel : premier demi-tour à y=19 avec 13,6 de carburant (retour calculé 14,3) ; vente 70 ; Réservoir+ ; puis des ventes de 100, 85, 70, 55 et 10, chaque fois remises en plein. Dernier état : au Poste, **carburant 12,1, crédits 0**, frontière **rangée 54**, retour exigé **29,1**. 12,1 ne paie pas cette remontée. Pas d’Isolation (il aurait fallu 300). Le Cœur n’est pas à bord.

Le blocage petit : le coût de retour utilisé pour décider d’un pas (`fuelTo`) n’est pas le chemin que le bot emprunte vraiment pour rentrer. Sur 1012 le plan s’arrête avec `retour` nul à y=33 alors qu’il revient quand même au Poste, puis il abandonne (`chemin`) avec encore **37,2** de carburant et **0** crédit. Creuser plus loin dans cet état est refusé à tort. Ce n’est pas une raison de changer le propulseur ni le réservoir.

## Ce qui n’a pas été fait

- **Essai sur un vrai téléphone : à faire par Pascal.**
- La physique n’est pas déterministe d’un appareil à l’autre. Seule la grille initiale l’est.
- Aucun fichier audio : silence voulu. Le bouton Son change la préférence.
- L’entraînement est une mini-mine fixe (graine affichée 20261106), pas la génératrice de 200 rangées.

## Écarts assumés, spec inchangée

1. Deux tests du plan se contredisaient (roche fissurée à la fois instable et stable dans le même montage ; file d’attente avant les 2 s). Les tests suivent la spec : annonce de 2,0 s, soutien latéral double = stable.
2. Le granite et la glace se forent en 1,0 s avec la mèche de base. La spec ne donne 1,0 s qu’avec la Mèche II. Valeur provisoire du plan, non changée.
3. La touche R sonde. La spec ne nommait que le bouton.
4. Score de défaite ou d’abandon = minerais vendus, sans retrancher les remorquages. La pénalité de 25 ne s’applique qu’à la victoire, comme l’écrit la spec.
5. L’explosion de gaz touche la case et ses huit voisines (rayon 1).
