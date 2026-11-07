# Foreuse Boréale — Spécification de design v1

Date : 2026-11-06 · Statut : **brouillon à approuver par Pascal** (aucun code, aucun dépôt).
Inspiration : *Drillers* (CGE, Španěl & Říman), seulement l'idée « descendre, forer, ramasser, remonter vendre, améliorer ». Aucune carte, illustration, texte, nom ni marque de Drillers n'est réutilisé. **Pas de cartes.**

## 0. Pivot « plus intelligent que bourrin » (directive Pascal, 6 nov., 21 h 36)
Jeu de **réflexion et de planification**, pas d'adresse frénétique. Le pilotage direct et la physique en temps réel restent (choix de Pascal), mais : **aucune limite de temps ni score de vitesse** ; le temps n'est qu'informatif. Les risques sont lisibles et annoncés avant qu'on s'engage, les annonces sont lentes (≈ 2 s), il n'y a ni ennemis ni combat, le forage se fait en maintenant (jamais en tapant à répétition), et la pause est libre pour consulter la carte connue. L'enjeu : choisir une route, gérer le coût et le soutien du terrain.

## 1. Le jeu en une phrase
Jeu 2D vu de côté, dans le navigateur (mobile et ordinateur) : on pilote directement une foreuse à chenilles sous le pergélisol, on creuse, ramasse des minerais, remonte au Poste vendre et s'améliorer **pendant la même partie**, et on planifie ses descentes pour ramener le **Cœur boréal** sans perdre sa foreuse.

## 2. Périmètre
**v1 :** partie solo d'environ 20–40 min, à son rythme, mine générée par graine (différente à chaque nouvelle partie), physique temps réel bornée, entraînement rapide, clavier + tactile, audio optionnel.
**Exclus :** multijoueur, 3D, progression permanente/campagne (plus tard, si Pascal le demande), simulation complète du sol ou des fluides, éditeur, comptes ou classements en ligne.

## 3. Boucle
1. Départ au Poste (surface) : carburant plein, coque intacte, 50 crédits.
2. On fore vers le bas ; les minerais détachés deviennent des pépites à ramasser au contact (soute limitée).
3. On remonte au propulseur (§5) jusqu'à la plateforme du Poste.
4. Vente automatique, puis l'Atelier pour plein, réparation, améliorations (§8).
5. On répète jusqu'à une fin de partie (§9).

## 4. Monde et génération
- Grille **40 × 200 tuiles** de 32 px ; murs latéraux et fond indestructibles. Rangée 0 = surface.
- **Terrain déterministe** : graine 32 bits → PRNG mulberry32 → grille logique (pas un corps physique par tuile). Les collisions terrain sont des corps statiques fusionnés, reconstruits seulement pour le morceau 8×8 modifié.
- 4 strates de 50 rangées (tourbe, argile, granite, glace ancienne) ; dureté et valeur croissent avec la profondeur.
- Tuiles : vide, terre (selon strate), roche meuble (≈ 8 % de la terre, §6), roche dure (exige Mèche II), roc-mère (bordures), minerai (cuivre, argent, or, cristal), poche de gaz, Cœur boréal (une tuile, rangée 195).
- **Garantie topologique seulement** : un BFS vérifie qu'un chemin forable mène du Poste au Cœur et à ≥ 80 % de la valeur minerai (roche dure comptée forable avec Mèche II). Sinon on retire la roche dure le long du chemin et on revérifie. Ce n'est **pas** une preuve que la victoire est faisable côté carburant ou économie.
- **Départ garanti** : les rangées 1–30 contiennent ≥ 6 cuivre et ≥ 2 argent sans roche dure, pour payer les premiers pleins. La faisabilité complète sera testée plus tard sur des graines de validation (§16) ; elle n'est pas démontrée.
- **Lecture du terrain** : strates distinguées par la couleur ; minerais visibles dans un rayon de 3 tuiles autour de la foreuse et mémorisés ensuite (carte connue) ; roche meuble marquée de fissures visibles ; poches de gaz signalées par des bulles dès qu'elles entrent dans ce rayon. Aucun danger n'apparaît sans indice.
- **Sondage** : bouton Sonder (3 carburant, foreuse immobile) qui révèle une colonne de 8 tuiles sous la foreuse. C'est la seule aide d'exploration.
- **Routes** : la génération garantit au moins 2 descentes distinctes vers la strate 3 (vérification BFS), pour offrir de vrais choix de chemin.
- La physique en temps réel n'est pas déterministe d'un appareil à l'autre ; seuls le terrain initial et les tirages de la génération sont reproductibles.

## 5. Foreuse
- Corps Matter 28×28 px, rotation verrouillée.
- **Chenilles** : horizontal au sol, 3 tuiles/s max.
- **Propulseur** : poussée verticale à 4 tuiles/s dans tout puits. Il donne une mobilité verticale mais **ne garantit pas la sortie** : sans carburant il est coupé, et le recours est le remorquage (§7). Il ne fore jamais.
- **Forage** : gauche, droite (en roulant contre une tuile) ou bas, jamais vers le haut. Le forage avance tant qu'on **maintient** la direction (relâcher met en pause sans perdre la progression de la tuile). Durée = dureté ÷ puissance (terre 0,35 s, argile 0,6 s, granite 1,0 s avec Mèche II). La foreuse s'aligne sur la tuile ciblée.
- **Caméra** : suit avec une zone morte, bornée aux murs et à la surface ; zoom fixe (≈ 12 tuiles de large sur mobile, 20 sur ordinateur).

## 6. Physique bornée
- **Déclencheur local et déterministe** : après chaque tuile forée, on vérifie seulement la roche meuble dans un rayon de 3 tuiles. Sans support (rien dessous, et pas de solide à la fois à gauche et à droite), elle devient instable.
- **Annonce** : 2,0 s de tremblement et de poussière, puis elle tombe comme corps dynamique 1×1.
- Impact sur la foreuse > 3 tuiles/s : 15 dégâts.
- Une roche meuble n'est jamais instable dès la génération : seul le forage du joueur peut retirer son support, donc chaque chute découle d'un choix visible.
- **Re-figement** : immobile 0,5 s (ou au plus 4 s), le bloc redevient une tuile dans la case qu'il occupe, **seulement si** cela ne chevauche ni la foreuse, ni le Cœur, ni une pépite, et laisse à la foreuse une case libre adjacente. Sinon il reste un **corps endormi** (obstacle statique, forable comme sa strate) ; jamais de téléportation.
- **Plafonds** : 12 blocs dynamiques ou endormis ; les suivants attendent en file, toujours annoncés au moment de leur chute. 40 pépites dynamiques ; au-delà, la plus ancienne devient statique.
- **Pépites** : 1 par minerai. Après 6 s au repos, une pépite devient **statique** (hors physique, conservée dans la grille jusqu'à la fin de la partie, ramassable au contact). Rien de précieux n'est perdu.
- **Pas fixe** à 60 Hz avec accumulateur, 4 sous-pas max par image (le retard en trop est abandonné) ; vitesse des corps plafonnée à 12 tuiles/s.

## 7. Ressources et dangers
- **Carburant** 100. Un seul débit continu à la fois, le plus élevé : propulseur 3/s, sinon chenilles en mouvement 1/s, immobile 0. Le forage coûte 2 par tuile terminée, sans débit de roulement pendant le forage. À 0 : chenilles à 30 % de vitesse, propulseur coupé.
- **Réserve de retour** (HUD) : estimation prudente = 3 × profondeur en tuiles × 1,25 carburant, affichée en orange quand le carburant s'en approche. C'est une **estimation, pas une garantie** (détours, blocs).
- **Remorquage** (menu, toujours disponible sous la surface) : retour au Poste, soute vidée (le Cœur retourne à sa tuile d'origine), 50 crédits. Défaite si crédits < 50.
- **Coque** 100. Dégâts : blocs (15), gaz (20), chute = 5 × (tuiles de chute − 6) au-delà de 6 tuiles, chaleur. 0 = défaite.
- **Soute** 10 pépites ; pleine = plus de ramassage. Le **Cœur** occupe un emplacement à part.
- **Gaz annoncé** : forer à côté d'une poche déclenche 2,0 s de sifflement et de lueur, puis une explosion de rayon 1 (20 dégâts). On peut reculer.
- **Chaleur annoncée** : sous la rangée 150, ligne rouge visible et message à l'entrée ; sans Isolation, 1 dégât toutes les 2 s.

## 8. Économie (valeurs provisoires à ajuster)
| Minerai | Strate | Valeur |
|---|---|---|
| Cuivre | 1–2 | 10 |
| Argent | 2–3 | 25 |
| Or | 3–4 | 60 |
| Cristal boréal | 4 | 150 |

| Amélioration (achat unique) | Coût | Effet immédiat |
|---|---|---|
| Réservoir+ | 120 | carburant max 160, jauge remplie |
| Soute+ | 150 | soute 18 |
| Mèche II | 250 | fore la roche dure, forage 30 % plus rapide |
| Blindage | 200 | coque max 160, jauge remplie |
| Isolation | 300 | aucun dégât de chaleur |

- Crédits initiaux : **50**. Plein : 1 crédit/unité ; réparation : 2 crédits/point ; jusqu'au maximum courant, limités aux crédits disponibles.
- **Poste** : à l'arrêt sur la plateforme, **une seule** vente automatique de la soute par arrivée ; elle ne se rejoue qu'après avoir quitté puis réatteint la plateforme. Le plein, la réparation et les achats se font dans l'**Atelier**, qui fige la physique.

## 9. Fins de partie (toujours finies)
- **Victoire** : Cœur ramené au Poste. Score = valeur totale des minerais vendus + 500 (Cœur) − 25 × remorquages. Aucun élément de vitesse.
- **Défaite** : coque à 0, ou remorquage sans 50 crédits. Score = valeur des minerais vendus.
- **Pas de limite de temps.** La partie reste finie : le Cœur est un objectif unique, et la mine (minerais en nombre fini) s'épuise. Si les crédits sont < 50 sans carburant, le remorquage mène à la défaite. Un bouton « Abandonner » termine aussi la partie. Le temps joué est affiché à titre informatif seulement.
- Écran de fin : score, graine, « Rejouer cette mine » / « Nouvelle mine ».

## 10. Graines et redémarrage
« Nouvelle mine » = graine aléatoire ; « Rejouer » = même graine. Toute partie repart de zéro (améliorations, crédits, terrain). Graine partageable par `?seed=`, sans serveur.

## 11. Interface et contrôles
- **Clavier** : A/← et D/→ rouler (et forer latéralement contre une tuile) ; S/↓ forer vers le bas ; W/↑/Espace propulseur seulement ; Échap/P pause ; M son.
- **Tactile** : croix à gauche (gauche, droite, bas), bouton Propulseur à droite, bouton Pause ; cibles ≥ 56 px ; `touch-action: none` sur le canvas.
- **Relâchement** : toutes les actions sont relâchées sur `pointerup`, `pointercancel`, la sortie d'un doigt du bouton, la perte de focus et l'onglet caché.
- **Pause libre** (bouton ou Échap) : tout est figé, on peut faire défiler la **carte connue** pour planifier. Il n'existe pas de commande qui arrête le temps en jeu : hors pause, tout se passe en temps réel.
- **Pause auto** sur `visibilitychange` ou `blur` ; physique gelée, accumulateur remis à 0 à la reprise.
- HUD : carburant, coque, soute, crédits, profondeur, réserve de retour estimée, temps joué (informatif) ; alerte carburant < 25 %. Textes en français québécois.

## 12. Sauvegarde
localStorage : préférences seulement (son, volume, entraînement fait, meilleur score des parties normales). **Partie en cours non sauvegardée** : un rechargement l'abandonne (choix de simplicité).

## 13. Entraînement (≈ 2 min)
Mini-mine fixe : rouler, forer vers le bas, ramasser, propulseur, éviter un bloc annoncé, reculer devant un gaz annoncé, revenir vendre. Chaque étape se valide par l'action. On peut le passer ou le rejouer depuis le menu. **Aucun record ni score enregistré.**

## 14. Audio et art
- **Audio optionnel** : musique activée par défaut, démarrée au premier geste (règle des navigateurs) ; bouton son toujours visible. Sans fichiers audio : **silence**, aucun son généré de secours.
- **Art** : v1 en primitives géométriques de remplacement seulement (rectangles et cercles colorés), aucune illustration générée. Illustrations commandées plus tard à Créa, musique à SUNO ; aucun contact maintenant. Un manifeste de ressources permettra de les brancher sans toucher à la logique.

## 15. Architecture proposée
Phaser 3 + Matter.js (inclus), site statique sur GitHub Pages. Alternative plus légère : Canvas2D + Matter seul ; on recommande Phaser pour la caméra, l'entrée et l'audio intégrés.
Unités :
- `rng` : PRNG à graine.
- `mineGen` : graine → grille, BFS topologique, minerais de départ (pur).
- `terrain` : grille, forage, collisions par morceau.
- `collapse` : support, annonce, file et plafond, re-figement ou corps endormi.
- `pickups` : pépites dynamiques ou statiques, soute, Cœur.
- `drill` : déplacement, propulseur, forage, carburant, coque, chutes.
- `hazards` : gaz, chaleur, annonces.
- `economy` : prix, améliorations, Poste et Atelier (pur).
- `runState` : temps joué informatif, pause, fins, graine, redémarrage (pur).
- `input` : clavier et tactile → actions abstraites, relâchements.
- `ui/hud`, `tutorial`, `audio`, `prefs`.

## 16. Tests d'acceptation
- [ ] 1 000 graines : garantie topologique et minerais de départ respectés ; même graine = même grille (automatisé).
- [ ] 20 graines de validation : un parcours joué ou scripté atteint la victoire avec les valeurs v1 ; sinon, on ajuste les valeurs (non démontré à ce jour).
- [ ] Forage dans les 3 directions ; aucune traversée de tuile à vitesse max ; montée de 30 tuiles au propulseur avec carburant suffisant.
- [ ] Carburant : pas de double débit pendant le forage ; immobile = 0.
- [ ] Effondrement seulement après 1 s d'annonce ; plafonds 12/40 tenus ; re-figement jamais sur la foreuse, le Cœur ou une pépite, sans enfermement, sinon corps endormi forable ; pépite statique ramassable.
- [ ] 5 min d'effondrements répétés sans instabilité physique, fréquence d'image acceptable sur un ordinateur de référence.
- [ ] Une vente par arrivée au Poste ; l'Atelier fige la physique.
- [ ] Fins : victoire (formule de score sans vitesse), abandon, coque à 0, remorquage sans crédits ; « Rejouer » = même graine, « Nouvelle » = autre graine.
- [ ] Lisibilité : roche meuble, gaz et minerais visibles avant d'atteindre la tuile ; sondage révèle 8 tuiles ; ≥ 2 descentes vers la strate 3 ; réserve de retour affichée.
- [ ] Forage par maintien ; relâcher conserve la progression ; annonces de 2 s.
- [ ] Gaz et chaleur annoncés avant tout dégât ; dégâts de chute selon la formule.
- [ ] Pause sur onglet caché et perte de focus ; touches et pointeurs relâchés.
- [ ] Son démarré au premier geste, bouton son fonctionnel, silence sans fichiers audio.
- [ ] Tactile vérifié en émulation mobile du navigateur ; **test sur un vrai téléphone à faire par Pascal** (non effectué).
- [ ] Entraînement terminable et passable, sans record.

## 17. Compromis assumés
Pas de pression de temps : la difficulté vient de la route, du carburant et du soutien du terrain ; le temps réel demande un peu de pilotage, mais réduit au minimum. Le propulseur rend la remontée possible mais coûteuse ; sans carburant, seul le remorquage sauve (soute perdue). Seule la roche meuble tombe ; le terrain n'est pas simulé. Pas de sauvegarde en cours de partie, pas de progression permanente en v1. Tous les chiffres sont des **choix de départ à ajuster**, pas des mesures.
