# Foreuse Boréale

**Prototype jouable. L’équilibre n’est pas final** : le retour du Cœur n’est pas validé à 18/20. Ce n’est pas la version d’équilibre définitive.

Pour jouer sans installation : enregistre `Foreuse-Boreale.html`, puis ouvre ce fichier depuis le dossier Téléchargements (double-clic). L’aperçu dans un zip ou dans le clavardage ne lance pas le jeu.

Sur GitHub Pages, le même fichier est `docs/index.html`. L’adresse d’un site de projet est `https://passcool17.github.io/foreuse-boreale/` (dossier `/foreuse-boreale/`). Tout est dans la page : pas de script séparé à charger.

Prototype d’un jeu de forage en 2D. On pilote une foreuse à chenilles sous le pergélisol, on choisit une route, on remonte vendre au Poste, et on tente de ramener le Cœur boréal. Pas de combat, pas de chrono, pas de score de vitesse.

L’idée « descendre, forer, remonter, améliorer » est un hommage au concept de *Drillers* (CGE). Aucune carte, aucun texte, aucun nom et aucune image de ce jeu ne sont repris.

Les graphismes sont des rectangles et des cercles de remplacement. Les illustrations (Créa) et la musique (SUNO) ne sont pas branchées. Sans fichier audio, le jeu reste silencieux.

## Lancer

Node n’est pas nécessaire pour jouer, seulement pour les tests.

```bash
node tools/serve.js
```

Ouvrir `http://127.0.0.1:41773/`. Le port se change avec `PORT=43111 node tools/serve.js`. Une graine se partage par `?seed=123`. `?debug=collapse` fait tomber des blocs pour observer la physique. `?debug=rescue-setup` place seulement le bouton de dépannage (carburant 5, crédits 10) : ce n’est pas une partie jouée.

Un rechargement abandonne la partie en cours. L’équilibre économique reste à revoir avant de le présenter comme terminé.

## Tests

Node 22 (ou ≥ 20). Le lanceur intégré suffit ; aucune dépendance de test.

```bash
npm test                 # règles pures
npm run sweep            # 1 000 graines
npm run feasibility      # bot, non une preuve
```

`npm test` lance `node --test test/*.test.js`. Sur Node 22, `node --test test/` ne parcourt pas le dossier.

Le détail des mesures est dans [docs/validation.md](docs/validation.md). L’addenda est dans `docs/superpowers/specs/2026-11-07-foreuse-boreale-balance-addendum.md`. Le forage coûte 1 carburant par tuile. Le propulseur brûle 2,4 par seconde depuis le 2026-11-07 (Toronto) et monte toujours à 4 tuiles/s. Les crédits de départ restent 50. Le dépannage du Poste est unique et n’ajoute rien au score. La cible 18/20 n’est pas atteinte à 2,4/s non plus. Un résultat de bot n’est pas une preuve de physique.

## Structure

- `src/core/` — règles pures, testées dans Node
- `src/game/` — Phaser 3.90.0 et Matter, pas fixe de 60 Hz
- `vendor/phaser.min.js` — Phaser 3.90.0, licence MIT (`vendor/PHASER-LICENSE.md`)
- `assets/manifest.json` — `"musique": null` tant qu’il n’y a pas de fichier
- `docs/superpowers/` — spec approuvée et plan

## Crédits techniques

Phaser 3.90.0 © Richard Davey, licence MIT. Le jeu lui-même est un prototype original.
