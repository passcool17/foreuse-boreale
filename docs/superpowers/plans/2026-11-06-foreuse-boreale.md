# Foreuse Boréale — Plan de réalisation

> **Pour les agents d'exécution :** SOUS-COMPÉTENCE REQUISE : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche par tâche. Les étapes utilisent des cases `- [ ]`.

**But :** construire la v1 de Foreuse Boréale décrite dans `docs/superpowers/specs/2026-11-06-foreuse-boreale-design.md` (spec approuvée par Pascal le 6 nov. 2026). Ce plan ne modifie pas la spec.

**Architecture :** le cœur est en JavaScript pur, en modules ES sans Phaser (`src/core/`), et testé dans Node. Une couche mince Phaser 3 + Matter (`src/game/`) affiche le jeu, lit les entrées et fait avancer la physique en **pas fixe de 60 Hz**. Le terrain est une grille logique déterministe (graine) ; seuls les blocs détachés, les pépites et la foreuse sont des corps Matter. La physique n'est **pas** promise déterministe d'un appareil à l'autre.

**Pile technique :** Phaser **3.90.0** (dernière 3.x stable sur le registre npm, vérifiée le 2026-11-06 ; la balise `latest` npm est 4.2.1, donc on **épingle 3.90.0** comme le dit la spec). Le fichier `phaser.min.js` est copié dans `vendor/`, sans bundler. Les tests utilisent le lanceur intégré de Node (`node --test`, Node 24 sur la box), donc aucune dépendance de test.

## Contraintes globales (copiées de la spec)
- Pas de cartes. Aucune réutilisation de texte, d'art, de nom ou de marque de Drillers.
- Réflexion et planification : **aucune limite de temps, aucun score de vitesse**, temps affiché seulement ; pas d'ennemis ni de combat ; annonces de danger de **2,0 s** ; forage par **maintien**.
- Grille 40 × 200, tuiles de 32 px, 4 strates de 50 rangées, Cœur à la rangée 195.
- Carburant 100, coque 100, soute 10, crédits initiaux 50, remorquage 50 crédits.
- Plafonds : 12 blocs (dynamiques et endormis), 40 pépites dynamiques ; pépite statique après 6 s au repos.
- Pas de sauvegarde de partie ; localStorage pour les préférences seulement. L'entraînement n'enregistre aucun record.
- Graphismes en primitives géométriques seulement ; pas de média généré. Audio absent = silence.
- Textes du jeu en français québécois.
- Aucune création de dépôt, aucun push, aucune publication sans autorisation explicite (Lot F).

## Statut des preuves (à respecter dans tous les rapports)
- **Prouvé par test automatisé (quand il passe)** : déterminisme de la grille, garantie topologique, minerais de départ, règles pures (carburant, économie, effondrement, pépites, fins de partie, entrées).
- **Hypothèse à valider** : faisabilité économique de la victoire, stabilité de Matter à 60 Hz, confort mobile. Les tâches 9 et 10 la mesurent ; rien n'est affirmé avant.
- Ce plan ne prétend qu'aucun test a déjà passé.

## Structure des fichiers
```
foreuse-boreale/
  index.html            page unique, charge vendor/phaser.min.js puis src/game/main.js
  package.json          scripts test/serve, aucune dépendance d'exécution
  vendor/phaser.min.js  Phaser 3.90.0 copié depuis le paquet npm
  README.md             lancer, tester, structure, crédits
  GAME.md               règles pour le joueur, en français
  src/core/config.js    toutes les valeurs provisoires de la spec
  src/core/rng.js       mulberry32
  src/core/tiles.js     énumération des tuiles et propriétés
  src/core/mineGen.js   graine → grille + vérifications
  src/core/topology.js  BFS (chemin, routes distinctes)
  src/core/rig.js       carburant, coque, soute, Cœur, chutes
  src/core/economy.js   Poste (vente unique), Atelier, remorquage
  src/core/run.js       état de partie, fins, score, graine/URL
  src/core/collapse.js  support, annonce, file, plafond, re-figement sûr
  src/core/pickups.js   pépites dynamiques/statiques
  src/core/hazards.js   gaz, chaleur
  src/core/knowledge.js carte connue, révélation, sondage, réserve de retour
  src/core/input.js     actions abstraites et relâchements
  src/core/prefs.js     préférences localStorage
  src/game/main.js      configuration Phaser, boucle à pas fixe
  src/game/MineScene.js rendu primitif, corps Matter, caméra
  src/game/Hud.js       HUD, boutons tactiles, pause/carte, Atelier, fins
  src/game/audio.js     musique optionnelle, silence par défaut
  src/game/tutorial.js  étapes de l'entraînement
  test/*.test.js        tests Node
  tools/seedSweep.js    balayage de 1 000 graines
  tools/feasibility.js  bot de faisabilité sur 20 graines (hypothèse)
```

## Ordre des lots
- **A** Socle et génération (tâches 1–2)
- **B** Règles pures (tâches 3–6)
- **C** Intégration Phaser (tâches 7–8)
- **D** Validation (tâches 9–10)
- **E** Documentation (tâche 11)
- **F** Publication conditionnelle (tâche 12)

---

### Tâche 1 : Socle, configuration, RNG, tuiles

**Fichiers :** créer `package.json`, `index.html`, `.gitignore`, `src/core/config.js`, `src/core/rng.js`, `src/core/tiles.js` ; test `test/rng.test.js`.

**Interfaces produites :**
- `mulberry32(seed: number): () => number` (valeurs dans [0,1[)
- `parseSeed(str: string|null): number|null`, `randomSeed(): number`
- `TILE` (énumération), `TILE_INFO[t]: {hardness:number, solid:boolean, drillable:boolean, needsBit2:boolean, value:number}`
- `CFG` (objet gelé)

- [ ] **Étape 1 : initialiser le dossier (sans dépôt distant).** `git init` est **local** et autorisé seulement quand le passage au codage est approuvé. Aucun dépôt distant n'est créé.
```bash
cd /workspace/foreuse-boreale && git init -b main
npm pack phaser@3.90.0 && tar -xzf phaser-3.90.0.tgz package/dist/phaser.min.js && mkdir -p vendor && mv package/dist/phaser.min.js vendor/ && rm -rf package phaser-3.90.0.tgz
```
- [ ] **Étape 2 : `package.json`**
```json
{ "name": "foreuse-boreale", "private": true, "type": "module",
  "scripts": { "test": "node --test test/", "sweep": "node tools/seedSweep.js", "feasibility": "node tools/feasibility.js" } }
```
- [ ] **Étape 3 : écrire le test qui échoue** `test/rng.test.js`
```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { mulberry32, parseSeed } from '../src/core/rng.js';
test('même graine, même suite', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
test('valeurs dans [0,1[', () => { const r = mulberry32(7); for (let i=0;i<1000;i++){ const v=r(); assert.ok(v>=0 && v<1);} });
test('parseSeed', () => { assert.equal(parseSeed('123'), 123); assert.equal(parseSeed('abc'), null); assert.equal(parseSeed(null), null); });
```
- [ ] **Étape 4 :** `npm test` → ÉCHEC (module introuvable).
- [ ] **Étape 5 : implémenter**
```js
// src/core/rng.js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const parseSeed = s => (s != null && /^\d{1,10}$/.test(s)) ? (Number(s) >>> 0) : null;
export const randomSeed = () => (Math.random() * 2 ** 32) >>> 0;
```
```js
// src/core/config.js — valeurs PROVISOIRES de la spec (choix, pas mesures)
export const CFG = Object.freeze({
  W: 40, H: 200, TILE_PX: 32, STRATUM_ROWS: 50, HEART_ROW: 195,
  FUEL_MAX: 100, HULL_MAX: 100, CARGO_MAX: 10, START_CREDITS: 50,
  TRACK_SPEED: 3, THRUST_SPEED: 4, MAX_BODY_SPEED: 12,
  FUEL_TRACK: 1, FUEL_THRUST: 3, FUEL_PER_TILE: 2, FUEL_EMPTY_SPEED_FACTOR: 0.3,
  DRILL_TIME: { terre: 0.35, argile: 0.6, granite: 1.0 }, BIT2_SPEEDUP: 0.3,
  WARN_S: 2.0, COLLAPSE_RADIUS: 3, LOOSE_RATIO: 0.08, BLOCK_DMG: 15, BLOCK_DMG_SPEED: 3,
  SETTLE_S: 0.5, SETTLE_MAX_S: 4, MAX_BLOCKS: 12, MAX_NUGGETS: 40, NUGGET_STATIC_S: 6,
  GAS_DMG: 20, FALL_FREE_TILES: 6, FALL_DMG_PER_TILE: 5, HEAT_ROW: 150, HEAT_DMG: 1, HEAT_PERIOD_S: 2,
  REVEAL_RADIUS: 3, SURVEY_FUEL: 3, SURVEY_DEPTH: 8, TOW_COST: 50, TOW_PENALTY: 25, HEART_POINTS: 500,
  FUEL_PRICE: 1, REPAIR_PRICE: 2, RESERVE_FACTOR: 1.25,
  STEP_HZ: 60, MAX_SUBSTEPS: 4,
});
```
```js
// src/core/tiles.js
export const TILE = Object.freeze({ VIDE:0, TOURBE:1, ARGILE:2, GRANITE:3, GLACE:4, MEUBLE:5, DURE:6, ROCMERE:7, CUIVRE:8, ARGENT:9, OR:10, CRISTAL:11, GAZ:12, COEUR:13 });
const S = (hardness, extra={}) => ({ hardness, solid:true, drillable:true, needsBit2:false, value:0, ...extra });
export const TILE_INFO = Object.freeze({
  [TILE.VIDE]: { hardness:0, solid:false, drillable:false, needsBit2:false, value:0 },
  [TILE.TOURBE]: S(0.35), [TILE.ARGILE]: S(0.6), [TILE.GRANITE]: S(1.0), [TILE.GLACE]: S(1.0),
  [TILE.MEUBLE]: S(0.35), [TILE.DURE]: S(1.0, { needsBit2:true }),
  [TILE.ROCMERE]: S(Infinity, { drillable:false }),
  [TILE.CUIVRE]: S(0.6, { value:10 }), [TILE.ARGENT]: S(0.6, { value:25 }),
  [TILE.OR]: S(1.0, { value:60 }), [TILE.CRISTAL]: S(1.0, { value:150 }),
  [TILE.GAZ]: S(0.35), [TILE.COEUR]: S(1.0),
});
export const isOre = t => TILE_INFO[t].value > 0;
```
Dans `TILE_INFO`, `hardness` vaut directement la durée de forage en secondes avec la mèche de base (le granite et la glace à 1,0 s, comme dans la spec ; la spec ne donne la durée du granite qu'avec la Mèche II, donc on garde 1,0 s comme valeur provisoire unique).
- [ ] **Étape 6 :** `index.html` : `<canvas>` plein écran, `<script src="vendor/phaser.min.js">`, `<script type="module" src="src/game/main.js">`, `<html lang="fr-CA">`, et un style `canvas{touch-action:none}`.
- [ ] **Étape 7 :** `npm test` → RÉUSSITE. Commit local : `git add -A && git commit -m "socle: config, rng, tuiles"`.

### Tâche 2 : Génération de mine et topologie

**Fichiers :** créer `src/core/topology.js`, `src/core/mineGen.js` ; test `test/mineGen.test.js`.

**Interfaces :**
- `generateMine(seed:number): Mine`, où `Mine = { seed, w, h, tiles: Uint8Array, idx(x,y):number, get(x,y):number, set(x,y,t):void, heart:{x,y}, shaftX:number }`
- `reachable(mine, from:{x,y}, {bit2:boolean}): Uint8Array` (masque des cases atteignables en forant, roc-mère exclu)
- `distinctDescents(mine, targetRow:number): number` (nombre de routes disjointes depuis la surface, plafonné à 2)

- [ ] **Étape 1 : tests qui échouent**
```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { generateMine } from '../src/core/mineGen.js';
import { reachable, distinctDescents } from '../src/core/topology.js';
import { TILE, TILE_INFO } from '../src/core/tiles.js';
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 1);
test('déterminisme', () => { assert.deepEqual(generateMine(99).tiles, generateMine(99).tiles); });
test('bordures en roc-mère, surface vide', () => { const m = generateMine(5);
  for (let y = 0; y < m.h; y++) { assert.equal(m.get(0,y), TILE.ROCMERE); assert.equal(m.get(m.w-1,y), TILE.ROCMERE); }
  for (let x = 1; x < m.w-1; x++) assert.equal(m.get(x,0), TILE.VIDE); });
for (const s of SEEDS) test(`topologie graine ${s}`, () => {
  const m = generateMine(s); const r = reachable(m, { x: m.shaftX, y: 0 }, { bit2: true });
  assert.equal(r[m.idx(m.heart.x, m.heart.y)], 1, 'Cœur atteignable');
  let tot = 0, ok = 0; for (let i = 0; i < m.tiles.length; i++) { const v = TILE_INFO[m.tiles[i]].value; tot += v; if (r[i]) ok += v; }
  assert.ok(ok >= 0.8 * tot, 'au moins 80 % de la valeur');
  let cu = 0, ag = 0; for (let y = 1; y <= 30; y++) for (let x = 1; x < m.w-1; x++) { const t = m.get(x,y); if (t===TILE.CUIVRE) cu++; if (t===TILE.ARGENT) ag++; assert.notEqual(t, TILE.DURE); }
  assert.ok(cu >= 6 && ag >= 2, 'minerais de départ');
  assert.equal(distinctDescents(m, 100), 2, 'deux descentes vers la strate 3');
  for (let y = 1; y <= 30; y++) assert.notEqual(m.get(m.shaftX, y), TILE.DURE);
});
```
- [ ] **Étape 2 :** `node --test test/mineGen.test.js` → ÉCHEC.
- [ ] **Étape 3 : implémenter `topology.js`**
```js
import { TILE_INFO } from './tiles.js';
export function passable(t, bit2) { const i = TILE_INFO[t]; return !i.solid || (i.drillable && (bit2 || !i.needsBit2)); }
export function reachable(m, from, { bit2 }, blocked = null) {
  const seen = new Uint8Array(m.w * m.h), q = [m.idx(from.x, from.y)]; seen[q[0]] = 1;
  while (q.length) { const i = q.shift(), x = i % m.w, y = (i / m.w) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x+dx, ny = y+dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; const j = m.idx(nx, ny);
      if (seen[j] || (blocked && blocked[j]) || !passable(m.tiles[j], bit2)) continue; seen[j] = 1; q.push(j); } }
  return seen;
}
// Deux routes disjointes : on trouve une route, on bloque ses cases sous la rangée 5, puis on en cherche une autre.
export function distinctDescents(m, targetRow) {
  const path = (blocked) => { const prev = new Int32Array(m.w*m.h).fill(-2), q = [];
    for (let x = 1; x < m.w-1; x++) { const i = m.idx(x,0); prev[i] = -1; q.push(i); }
    while (q.length) { const i = q.shift(), x = i % m.w, y = (i/m.w)|0; if (y === targetRow) { const p=[]; for (let k=i;k!==-1;k=prev[k]) p.push(k); return p; }
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx, ny=y+dy; if (nx<0||ny<0||nx>=m.w||ny>=m.h) continue; const j=m.idx(nx,ny);
        if (prev[j]!==-2 || blocked[j] || !passable(m.tiles[j], true)) continue; prev[j]=i; q.push(j); } }
    return null; };
  const blocked = new Uint8Array(m.w*m.h); const p1 = path(blocked); if (!p1) return 0;
  for (const i of p1) if (((i/m.w)|0) > 5) blocked[i] = 1;
  return path(blocked) ? 2 : 1;
}
```
- [ ] **Étape 4 : implémenter `mineGen.js`.** Ordre : remplir les strates, placer la roche meuble (≈ 8 % de la terre) avec des fissures visibles, les veines de minerai par strate (cuivre 1–2, argent 2–3, or 3–4, cristal 4), la roche dure (pas dans les rangées 1–30), le gaz (pas dans les rangées 1–10 ni dans le puits) et le Cœur. Ensuite : réparation de la topologie (retirer la roche dure sur le chemin BFS et creuser une 2e route si `distinctDescents < 2`), puis placement forcé des minerais de départ manquants.
```js
import { mulberry32 } from './rng.js'; import { TILE, TILE_INFO } from './tiles.js'; import { CFG } from './config.js';
import { reachable, distinctDescents } from './topology.js';
const STRATA = [TILE.TOURBE, TILE.ARGILE, TILE.GRANITE, TILE.GLACE];
const ORES = [[TILE.CUIVRE,0,1,0.03],[TILE.ARGENT,1,2,0.02],[TILE.OR,2,3,0.015],[TILE.CRISTAL,3,3,0.008]];
export function makeMine(seed, w = CFG.W, h = CFG.H) {
  const tiles = new Uint8Array(w*h), idx = (x,y) => y*w + x;
  return { seed, w, h, tiles, idx, get:(x,y)=>tiles[idx(x,y)], set:(x,y,t)=>{ tiles[idx(x,y)] = t; }, heart:null, shaftX: w >> 1, loose: new Uint8Array(w*h) };
}
export function generateMine(seed) {
  const r = mulberry32(seed), m = makeMine(seed), { w, h } = m;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x === 0 || x === w-1 || y === h-1) { m.set(x,y,TILE.ROCMERE); continue; }
    if (y === 0) { m.set(x,y,TILE.VIDE); continue; }
    const s = Math.min(3, Math.floor((y-1) / CFG.STRATUM_ROWS)); let t = STRATA[s];
    const u = r();
    let acc = 0; for (const [ore, a, b, p] of ORES) if (s >= a && s <= b) { acc += p; if (u < acc) { t = ore; break; } }
    if (t === STRATA[s]) { const v = r();
      if (y > 30 && v < 0.06) t = TILE.DURE; else if (y > 10 && x !== m.shaftX && v < 0.075) t = TILE.GAZ;
      else if (v < 0.075 + CFG.LOOSE_RATIO) t = TILE.MEUBLE; }
    m.set(x,y,t);
  }
  const hx = 1 + Math.floor(r() * (w-2)); m.heart = { x: hx, y: CFG.HEART_ROW }; m.set(hx, CFG.HEART_ROW, TILE.COEUR);
  repairTopology(m, r); ensureStartOres(m, r); return m;
}
function carveRoute(m, x0, r) { let x = x0; for (let y = 1; y < m.h-1; y++) {
  if (TILE_INFO[m.get(x,y)].needsBit2 && y <= 30) m.set(x,y,STRATA[0]);
  if (y % 7 === 0) x = Math.max(1, Math.min(m.w-2, x + (r() < 0.5 ? -1 : 1))); } }
function repairTopology(m, r) {
  for (let y = 1; y <= 30; y++) if (m.get(m.shaftX,y) === TILE.DURE) m.set(m.shaftX,y,TILE.TOURBE);
  for (let pass = 0; pass < 10; pass++) {
    const reach = reachable(m, { x: m.shaftX, y: 0 }, { bit2: true });
    if (reach[m.idx(m.heart.x, m.heart.y)] && distinctDescents(m, 100) === 2 && valueShare(m, reach) >= 0.8) return;
    // Seul le roc-mère bloque au sens topologique ; on garde les bordures, donc on ouvre une route forable.
    carveRoute(m, 2 + Math.floor(r() * (m.w - 4)), r);
  }
  throw new Error(`graine ${m.seed} : topologie irréparable`);
}
function valueShare(m, reach) { let t = 0, o = 0; for (let i = 0; i < m.tiles.length; i++) { const v = TILE_INFO[m.tiles[i]].value; t += v; if (reach[i]) o += v; } return t ? o/t : 1; }
function ensureStartOres(m, r) {
  const count = t => { let n = 0; for (let y=1;y<=30;y++) for (let x=1;x<m.w-1;x++) if (m.get(x,y)===t) n++; return n; };
  for (const [t, need] of [[TILE.CUIVRE,6],[TILE.ARGENT,2]]) { let n = count(t);
    while (n < need) { const x = 1 + Math.floor(r()*(m.w-2)), y = 2 + Math.floor(r()*29); if (m.get(x,y) !== t && x !== m.shaftX) { m.set(x,y,t); n++; } } }
}
```
Remarque pour l'exécutant : dans cette grille, tout sauf le roc-mère est forable avec la Mèche II, donc le BFS échoue seulement si l'on ajoute plus tard d'autres obstacles. Le test reste la référence ; s'il échoue, on corrige la génération, jamais le test.
- [ ] **Étape 5 :** `npm test` → RÉUSSITE pour les 50 graines. Commit local `génération: mine à graine et topologie`.

### Tâche 3 : Foreuse (carburant, coque, soute, Cœur, chutes)

**Fichiers :** `src/core/rig.js` ; test `test/rig.test.js`.

**Interfaces :**
- `newRig(): Rig = { fuel, fuelMax, hull, hullMax, cargo: number[] (valeurs), cargoMax, heart:boolean, upgrades:Set<string> }`
- `fuelDrain(rig, {thrust:boolean, moving:boolean, drilling:boolean}, dt): void` — un seul débit continu, le plus élevé
- `onTileDrilled(rig): void` (−2)
- `speedFactor(rig): number` (1 ou 0,3 à vide) ; `canThrust(rig): boolean`
- `pickNugget(rig, value): boolean` ; `pickHeart(rig): void`
- `fallDamage(tiles:number): number` ; `damage(rig, n): void`

- [ ] **Étape 1 : tests qui échouent**
```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import * as R from '../src/core/rig.js';
test('débit unique : propulseur l’emporte', () => { const r = R.newRig(); R.fuelDrain(r, { thrust:true, moving:true }, 1); assert.equal(r.fuel, 97); });
test('forage : pas de débit de roulement', () => { const r = R.newRig(); R.fuelDrain(r, { moving:true, drilling:true }, 1); assert.equal(r.fuel, 100); R.onTileDrilled(r); assert.equal(r.fuel, 98); });
test('immobile = 0', () => { const r = R.newRig(); R.fuelDrain(r, {}, 5); assert.equal(r.fuel, 100); });
test('à vide : 30 % et pas de propulseur', () => { const r = R.newRig(); r.fuel = 0; assert.equal(R.speedFactor(r), 0.3); assert.equal(R.canThrust(r), false); });
test('soute pleine refuse, Cœur à part', () => { const r = R.newRig(); for (let i=0;i<10;i++) assert.ok(R.pickNugget(r, 10)); assert.equal(R.pickNugget(r, 10), false); R.pickHeart(r); assert.equal(r.heart, true); assert.equal(r.cargo.length, 10); });
test('chute', () => { assert.equal(R.fallDamage(6), 0); assert.equal(R.fallDamage(9), 15); });
```
- [ ] **Étape 2 :** exécuter → ÉCHEC.
- [ ] **Étape 3 : implémenter**
```js
import { CFG } from './config.js';
export const newRig = () => ({ fuel: CFG.FUEL_MAX, fuelMax: CFG.FUEL_MAX, hull: CFG.HULL_MAX, hullMax: CFG.HULL_MAX, cargo: [], cargoMax: CFG.CARGO_MAX, heart: false, upgrades: new Set() });
export function fuelDrain(rig, { thrust = false, moving = false, drilling = false }, dt) {
  const rate = thrust && rig.fuel > 0 ? CFG.FUEL_THRUST : (moving && !drilling ? CFG.FUEL_TRACK : 0);
  rig.fuel = Math.max(0, rig.fuel - rate * dt);
}
export const onTileDrilled = rig => { rig.fuel = Math.max(0, rig.fuel - CFG.FUEL_PER_TILE); };
export const speedFactor = rig => rig.fuel > 0 ? 1 : CFG.FUEL_EMPTY_SPEED_FACTOR;
export const canThrust = rig => rig.fuel > 0;
export function pickNugget(rig, value) { if (rig.cargo.length >= rig.cargoMax) return false; rig.cargo.push(value); return true; }
export const pickHeart = rig => { rig.heart = true; };
export const fallDamage = tiles => Math.max(0, CFG.FALL_DMG_PER_TILE * (tiles - CFG.FALL_FREE_TILES));
export const damage = (rig, n) => { rig.hull = Math.max(0, rig.hull - n); };
```
La spec n'interdit pas de forer avec peu de carburant : le forage reste permis et le carburant est borné à 0.
- [ ] **Étape 4 :** RÉUSSITE, puis commit local.

### Tâche 4 : Économie, Poste, Atelier, remorquage, fins de partie

**Fichiers :** `src/core/economy.js`, `src/core/run.js` ; tests `test/economy.test.js`, `test/run.test.js`.

**Interfaces :**
- `UPGRADES = { reservoir:{cost:120}, soute:{cost:150}, meche2:{cost:250}, blindage:{cost:200}, isolation:{cost:300} }`
- `newRun(seed, {tutorial=false}={}): Run = { seed, tutorial, rig, credits:50, sold:0, tows:0, onPad:false, status:'play'|'won'|'lost'|'abandoned', playedS:0, paused:false, workshopOpen:false }`
- `arriveAtPad(run): number` (vente unique, renvoie le montant) ; `leavePad(run)`
- `buy(run, id): boolean` ; `refuel(run): number` ; `repair(run): number`
- `tow(run, mine): void` ; `checkEnd(run): void` ; `score(run): number`
- `tick(run, dt)` : `playedS` augmente seulement si ni pause ni Atelier
- `seedFromUrl(search): number|null`, `urlForSeed(seed): string`

- [ ] **Étape 1 : tests qui échouent**
```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { newRun, arriveAtPad, leavePad, buy, refuel, repair, tow, checkEnd, score, tick } from '../src/core/run.js';
test('vente unique par arrivée', () => { const r = newRun(1); r.rig.cargo = [10, 25];
  assert.equal(arriveAtPad(r), 35); r.rig.cargo = [10]; assert.equal(arriveAtPad(r), 0);
  leavePad(r); assert.equal(arriveAtPad(r), 10); assert.equal(r.credits, 95); });
test('Cœur au Poste = victoire, score sans vitesse', () => { const r = newRun(1); r.rig.heart = true; r.rig.cargo=[60]; arriveAtPad(r);
  assert.equal(r.status, 'won'); assert.equal(score(r), 60 + 500); r.playedS = 9999; assert.equal(score(r), 560); });
test('amélioration : effet immédiat et jauge remplie', () => { const r = newRun(1); r.credits = 500; r.rig.fuel = 10;
  assert.ok(buy(r, 'reservoir')); assert.equal(r.rig.fuelMax, 160); assert.equal(r.rig.fuel, 160); assert.equal(buy(r, 'reservoir'), false); });
test('plein et réparation bornés aux crédits', () => { const r = newRun(1); r.rig.fuel = 0; r.credits = 30; assert.equal(refuel(r), 30); assert.equal(r.credits, 0);
  r.rig.hull = 50; r.credits = 20; assert.equal(repair(r), 10); assert.equal(r.rig.hull, 60); });
test('remorquage', () => { const r = newRun(1); r.rig.cargo=[10]; r.rig.heart = true; tow(r);
  assert.equal(r.credits, 0); assert.deepEqual(r.rig.cargo, []); assert.equal(r.rig.heart, false); assert.equal(r.tows, 1); assert.equal(r.status, 'play');
  tow(r); assert.equal(r.status, 'lost'); });
test('coque à 0 = défaite', () => { const r = newRun(1); r.rig.hull = 0; checkEnd(r); assert.equal(r.status, 'lost'); });
test('temps informatif gelé en pause/Atelier', () => { const r = newRun(1); tick(r, 1); r.paused = true; tick(r, 1); r.paused=false; r.workshopOpen = true; tick(r,1); assert.equal(r.playedS, 1); });
test('aucune défaite liée au temps', () => { const r = newRun(1); tick(r, 1e6); checkEnd(r); assert.equal(r.status, 'play'); });
```
- [ ] **Étape 2 :** ÉCHEC.
- [ ] **Étape 3 : implémenter**
```js
// src/core/economy.js
import { CFG } from './config.js';
export const UPGRADES = Object.freeze({
  reservoir: { cost:120, apply: r => { r.fuelMax = 160; r.fuel = 160; } },
  soute:     { cost:150, apply: r => { r.cargoMax = 18; } },
  meche2:    { cost:250, apply: () => {} },
  blindage:  { cost:200, apply: r => { r.hullMax = 160; r.hull = 160; } },
  isolation: { cost:300, apply: () => {} },
});
export const drillTime = (baseS, rig) => rig.upgrades.has('meche2') ? baseS * (1 - CFG.BIT2_SPEEDUP) : baseS;
export const canDrillTile = (info, rig) => info.drillable && (!info.needsBit2 || rig.upgrades.has('meche2'));
```
```js
// src/core/run.js
import { CFG } from './config.js'; import { newRig } from './rig.js'; import { UPGRADES } from './economy.js'; import { parseSeed } from './rng.js';
export const newRun = (seed, { tutorial = false } = {}) => ({ seed, tutorial, rig: newRig(), credits: CFG.START_CREDITS, sold: 0, tows: 0, onPad: false, status: 'play', playedS: 0, paused: false, workshopOpen: false });
export function arriveAtPad(run) { if (run.onPad) return 0; run.onPad = true;
  const v = run.rig.cargo.reduce((a, b) => a + b, 0); run.rig.cargo = []; run.credits += v; run.sold += v;
  if (run.rig.heart) run.status = 'won'; return v; }
export const leavePad = run => { run.onPad = false; };
export function buy(run, id) { const u = UPGRADES[id]; if (!u || run.rig.upgrades.has(id) || run.credits < u.cost) return false;
  run.credits -= u.cost; run.rig.upgrades.add(id); u.apply(run.rig); return true; }
export function refuel(run) { const n = Math.min(Math.ceil(run.rig.fuelMax - run.rig.fuel), Math.floor(run.credits / CFG.FUEL_PRICE));
  run.rig.fuel = Math.min(run.rig.fuelMax, run.rig.fuel + n); run.credits -= n * CFG.FUEL_PRICE; return n; }
export function repair(run) { const n = Math.min(run.rig.hullMax - run.rig.hull, Math.floor(run.credits / CFG.REPAIR_PRICE));
  run.rig.hull += n; run.credits -= n * CFG.REPAIR_PRICE; return n; }
export function tow(run) { if (run.credits < CFG.TOW_COST) { run.status = 'lost'; return; }
  run.credits -= CFG.TOW_COST; run.tows++; run.rig.cargo = []; run.rig.heart = false; run.onPad = false; }
export function checkEnd(run) { if (run.status === 'play' && run.rig.hull <= 0) run.status = 'lost'; }
export const abandon = run => { if (run.status === 'play') run.status = 'abandoned'; };
export const score = run => run.sold + (run.status === 'won' ? CFG.HEART_POINTS : 0) - CFG.TOW_PENALTY * run.tows;
export function tick(run, dt) { if (!run.paused && !run.workshopOpen && run.status === 'play') run.playedS += dt; }
export const seedFromUrl = search => parseSeed(new URLSearchParams(search).get('seed'));
export const urlForSeed = seed => `?seed=${seed}`;
```
L'appelant du remorquage (couche de jeu) remet le Cœur à sa tuile `mine.heart` et replace la foreuse sur la plateforme. Le score utilise `sold`, c'est-à-dire la valeur des minerais vendus, comme dans la spec.
- [ ] **Étape 4 :** RÉUSSITE, puis commit local.

### Tâche 5 : Effondrement prévisible et pépites

**Fichiers :** `src/core/collapse.js`, `src/core/pickups.js` ; tests `test/collapse.test.js`, `test/pickups.test.js`.

**Interfaces :**
- `newCollapse(): C = { warnings: {x,y,t}[], queue: {x,y}[], blocks: Block[] }` avec `Block = { id, x, y, state:'falling'|'sleeping', restS, ageS }`
- `afterDrill(c, mine, x, y): void` : vérifie la roche meuble dans un rayon de 3 et ajoute un avertissement de 2,0 s
- `advanceWarnings(c, mine, dt): {x,y}[]` : renvoie les tuiles à libérer (tuile retirée de la grille), limitée par le plafond (le reste attend en file d'attente)
- `trySettle(c, mine, block, cell:{x,y}, occupied:(x,y)=>boolean, rigCell:{x,y}): 'tile'|'sleeping'`
- `newPickups(): P = { dynamic: N[], static: N[] }`, `N = { id, value, x, y, restS }`
- `spawnNugget(p, value, x, y)`, `restTick(p, id, atRest:boolean, dt)`, `collect(p, id)`

- [ ] **Étape 1 : tests qui échouent**
```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { makeMine } from '../src/core/mineGen.js'; import { TILE } from '../src/core/tiles.js';
import * as C from '../src/core/collapse.js'; import * as P from '../src/core/pickups.js';
function box() { const m = makeMine(1, 10, 10); m.tiles.fill(TILE.TOURBE); return m; }
test('rien à la génération : seul le forage déclenche', () => { const c = C.newCollapse(); assert.equal(c.warnings.length, 0); });
test('roche meuble sans support → annonce 2 s puis chute', () => { const m = box(); m.set(5,4,TILE.MEUBLE); m.set(5,5,TILE.VIDE);
  const c = C.newCollapse(); C.afterDrill(c, m, 5, 5); assert.equal(c.warnings.length, 1);
  assert.deepEqual(C.advanceWarnings(c, m, 1.9), []); assert.deepEqual(C.advanceWarnings(c, m, 0.2), [{x:5,y:4}]); assert.equal(m.get(5,4), TILE.VIDE); });
test('support latéral double = stable', () => { const m = box(); m.set(5,4,TILE.MEUBLE); m.set(5,5,TILE.VIDE); const c = C.newCollapse(); C.afterDrill(c, m, 5, 5);
  // gauche et droite pleins (TOURBE), dessous vide → stable selon la spec
  assert.equal(c.warnings.length, 0); });
test('plafond 12 : file d’attente', () => { const m = box(); const c = C.newCollapse();
  for (let i = 0; i < 12; i++) c.blocks.push({ id:i, x:0, y:0, state:'falling', restS:0, ageS:0 });
  c.warnings.push({ x:2, y:2, t:0 }); assert.deepEqual(C.advanceWarnings(c, m, 0.1), []); assert.equal(c.queue.length, 1); });
test('re-figement jamais sur la foreuse/Cœur/pépite ni enfermement', () => { const m = box(); m.tiles.fill(TILE.VIDE); const c = C.newCollapse();
  const b = { id:1, x:3, y:3, state:'falling', restS:0, ageS:0 }; c.blocks.push(b);
  assert.equal(C.trySettle(c, m, b, {x:3,y:3}, () => false, {x:3,y:3}), 'sleeping');
  m.heart = {x:3,y:3}; assert.equal(C.trySettle(c, m, b, {x:3,y:3}, () => false, {x:8,y:8}), 'sleeping'); m.heart = {x:0,y:0};
  assert.equal(C.trySettle(c, m, b, {x:3,y:3}, (x,y) => x===3&&y===3, {x:8,y:8}), 'sleeping');
  m.tiles.fill(TILE.TOURBE); m.set(4,3,TILE.VIDE); m.set(3,3,TILE.VIDE);
  assert.equal(C.trySettle(c, m, b, {x:3,y:3}, () => false, {x:4,y:3}), 'sleeping', 'enfermerait la foreuse');
  m.set(5,3,TILE.VIDE); assert.equal(C.trySettle(c, m, b, {x:3,y:3}, () => false, {x:4,y:3}), 'tile'); assert.equal(m.get(3,3), TILE.TOURBE); });
test('pépite statique après 6 s, conservée, ramassable', () => { const p = P.newPickups(); const n = P.spawnNugget(p, 25, 1, 1);
  P.restTick(p, n.id, true, 5.9); assert.equal(p.dynamic.length, 1); P.restTick(p, n.id, true, 0.2); assert.equal(p.static.length, 1);
  assert.equal(P.collect(p, n.id).value, 25); assert.equal(p.static.length, 0); });
test('plafond 40 : la plus ancienne devient statique', () => { const p = P.newPickups(); for (let i=0;i<41;i++) P.spawnNugget(p, 10, i, 0);
  assert.equal(p.dynamic.length, 40); assert.equal(p.static.length, 1); assert.equal(p.static[0].x, 0); });
```
- [ ] **Étape 2 :** ÉCHEC.
- [ ] **Étape 3 : implémenter**
```js
// src/core/collapse.js
import { CFG } from './config.js'; import { TILE, TILE_INFO } from './tiles.js';
const solid = (m, x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || TILE_INFO[m.get(x, y)].solid;
export const newCollapse = () => ({ warnings: [], queue: [], blocks: [], nextId: 1 });
export const supported = (m, x, y) => solid(m, x, y + 1) || (solid(m, x - 1, y) && solid(m, x + 1, y));
export function afterDrill(c, m, x0, y0) { const R = CFG.COLLAPSE_RADIUS;
  for (let y = y0 - R; y <= y0 + R; y++) for (let x = x0 - R; x <= x0 + R; x++) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h || m.get(x, y) !== TILE.MEUBLE) continue;
    if (!supported(m, x, y) && !c.warnings.some(w => w.x === x && w.y === y) && !c.queue.some(q => q.x === x && q.y === y)) c.warnings.push({ x, y, t: 0 }); } }
export function advanceWarnings(c, m, dt) { const out = [];
  for (const w of c.warnings) w.t += dt;
  const ready = c.warnings.filter(w => w.t >= CFG.WARN_S); c.warnings = c.warnings.filter(w => w.t < CFG.WARN_S);
  for (const { x, y } of ready) c.queue.push({ x, y });
  while (c.queue.length && c.blocks.length < CFG.MAX_BLOCKS) { const { x, y } = c.queue.shift();
    if (m.get(x, y) !== TILE.MEUBLE) continue; m.set(x, y, TILE.VIDE);
    c.blocks.push({ id: c.nextId++, x, y, state: 'falling', restS: 0, ageS: 0 }); out.push({ x, y }); }
  return out; }
function rigHasExit(m, rig, cell) { return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => { const x = rig.x+dx, y = rig.y+dy;
  return !(x === cell.x && y === cell.y) && !solid(m, x, y); }); }
export function trySettle(c, m, block, cell, occupied, rigCell) {
  const bad = (cell.x === rigCell.x && cell.y === rigCell.y) || (m.heart && cell.x === m.heart.x && cell.y === m.heart.y)
    || occupied(cell.x, cell.y) || solid(m, cell.x, cell.y) || !rigHasExit(m, rigCell, cell);
  if (bad) { block.state = 'sleeping'; return 'sleeping'; }
  m.set(cell.x, cell.y, TILE.TOURBE + Math.min(3, Math.floor((cell.y - 1) / CFG.STRATUM_ROWS)));
  c.blocks = c.blocks.filter(b => b !== block); return 'tile'; }
```
La couche de jeu appelle `trySettle` quand un bloc est au repos depuis 0,5 s, ou après 4 s. Un bloc endormi reste un corps statique de la strate (même dureté), **forable**. Quand il est foré, il est retiré de `c.blocks` et `afterDrill` est appelé.
```js
// src/core/pickups.js
import { CFG } from './config.js';
let seq = 1;
export const newPickups = () => ({ dynamic: [], static: [] });
export function spawnNugget(p, value, x, y) { const n = { id: seq++, value, x, y, restS: 0 }; p.dynamic.push(n);
  if (p.dynamic.length > CFG.MAX_NUGGETS) p.static.push(p.dynamic.shift()); return n; }
export function restTick(p, id, atRest, dt) { const i = p.dynamic.findIndex(n => n.id === id); if (i < 0) return;
  const n = p.dynamic[i]; n.restS = atRest ? n.restS + dt : 0; if (n.restS >= CFG.NUGGET_STATIC_S) { p.dynamic.splice(i, 1); p.static.push(n); } }
export function collect(p, id) { for (const list of [p.dynamic, p.static]) { const i = list.findIndex(n => n.id === id); if (i >= 0) return list.splice(i, 1)[0]; } return null; }
```
Une pépite dynamique qui devient statique garde sa dernière position (`x`, `y` mis à jour par la couche de jeu avant `restTick`). La couche de jeu n'appelle `collect` que si `pickNugget` réussit (soute non pleine) ; sinon la pépite reste en place.
- [ ] **Étape 4 :** RÉUSSITE, puis commit local.

### Tâche 6 : Dangers, connaissance du terrain, sondage, réserve, entrées, préférences

**Fichiers :** `src/core/hazards.js`, `src/core/knowledge.js`, `src/core/input.js`, `src/core/prefs.js` ; tests `test/hazards.test.js`, `test/knowledge.test.js`, `test/input.test.js`, `test/prefs.test.js`.

**Interfaces :**
- `newHazards(): H = { gas: {x,y,t}[], heatAcc:number, inHeatAnnounced:boolean }`
- `armGasNear(h, mine, x, y)` (gaz voisin → annonce de 2 s) ; `advanceGas(h, mine, dt): {x,y}[]` (explosions : tuile détruite, appelant applique 20 dégâts si la foreuse est dans le rayon 1)
- `heatTick(h, rig, row, dt): {entered:boolean, dmg:number}`
- `newKnowledge(mine): Uint8Array` ; `reveal(k, mine, cx, cy, r=3)` ; `survey(k, mine, rig, cx, cy, still:boolean): boolean`
- `returnReserve(depthRows): number` = 3 × profondeur × 1,25
- `newInput(): I` avec `press(I, action, source)`, `release(I, action, source)`, `releaseAll(I)`, `isDown(I, action): boolean` ; actions `'left'|'right'|'down'|'thrust'|'survey'|'pause'|'mute'`
- `KEYMAP = { KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right', KeyS:'down', ArrowDown:'down', KeyW:'thrust', ArrowUp:'thrust', Space:'thrust', Escape:'pause', KeyP:'pause', KeyM:'mute' }`
- `loadPrefs(storage): Prefs = { music:true, volume:0.6, tutorialDone:false, best:0 }` ; `savePrefs(storage, prefs)` ; `recordScore(prefs, run, s): boolean`

- [ ] **Étape 1 : tests qui échouent (extraits obligatoires)**
```js
// test/hazards.test.js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { makeMine } from '../src/core/mineGen.js'; import { TILE } from '../src/core/tiles.js'; import * as H from '../src/core/hazards.js'; import { newRig } from '../src/core/rig.js';
test('gaz annoncé 2 s puis explosion', () => { const m = makeMine(1, 8, 8); m.tiles.fill(TILE.TOURBE); m.set(4,4,TILE.GAZ); const h = H.newHazards();
  H.armGasNear(h, m, 3, 4); assert.equal(h.gas.length, 1); assert.deepEqual(H.advanceGas(h, m, 1.9), []); assert.deepEqual(H.advanceGas(h, m, 0.2), [{x:4,y:4}]); assert.equal(m.get(4,4), TILE.VIDE); });
test('chaleur annoncée à l’entrée puis 1 dégât / 2 s, Isolation protège', () => { const h = H.newHazards(), r = newRig();
  assert.equal(H.heatTick(h, r, 151, 0).entered, true); assert.equal(H.heatTick(h, r, 151, 2).dmg, 1);
  r.upgrades.add('isolation'); assert.equal(H.heatTick(h, r, 151, 2).dmg, 0); });
// test/knowledge.test.js
import * as K from '../src/core/knowledge.js';
test('révélation rayon 3 mémorisée', () => { const m = makeMine(1, 20, 20); const k = K.newKnowledge(m); K.reveal(k, m, 10, 10); assert.equal(k[m.idx(13,10)], 1); assert.equal(k[m.idx(14,10)], 0); });
test('sondage : immobile, 3 carburant, 8 tuiles', () => { const m = makeMine(1, 20, 30); const k = K.newKnowledge(m), r = newRig();
  assert.equal(K.survey(k, m, r, 5, 5, false), false); assert.ok(K.survey(k, m, r, 5, 5, true)); assert.equal(r.fuel, 97); assert.equal(k[m.idx(5,13)], 1); assert.equal(k[m.idx(5,14)], 0); });
test('réserve prudente', () => assert.equal(K.returnReserve(40), 150));
// test/input.test.js
import * as I from '../src/core/input.js';
test('W = propulseur, S = forage bas, distincts', () => { assert.equal(I.KEYMAP.KeyW, 'thrust'); assert.equal(I.KEYMAP.KeyS, 'down'); });
test('relâchement par source et releaseAll', () => { const i = I.newInput(); I.press(i, 'left', 'key'); I.press(i, 'left', 'p1');
  I.release(i, 'left', 'key'); assert.ok(I.isDown(i, 'left')); I.releaseAll(i); assert.equal(I.isDown(i, 'left'), false); });
// test/prefs.test.js
import * as Pr from '../src/core/prefs.js';
const mem = () => { const s = {}; return { getItem: k => s[k] ?? null, setItem: (k, v) => { s[k] = String(v); } }; };
test('préférences par défaut, musique activée', () => assert.deepEqual(Pr.loadPrefs(mem()), { music:true, volume:0.6, tutorialDone:false, best:0 }));
test('entraînement sans record', () => { const p = Pr.loadPrefs(mem()); assert.equal(Pr.recordScore(p, { tutorial:true }, 999), false); assert.equal(p.best, 0); assert.ok(Pr.recordScore(p, { tutorial:false }, 10)); });
test('stockage illisible → défauts', () => assert.equal(Pr.loadPrefs({ getItem: () => '{bad', setItem(){} }).music, true));
test('aucune clé de partie', () => { const s = mem(); Pr.savePrefs(s, Pr.loadPrefs(s)); assert.equal(s.getItem('fb.run'), null); });
```
- [ ] **Étape 2 :** ÉCHEC.
- [ ] **Étape 3 : implémenter**
```js
// src/core/hazards.js
import { CFG } from './config.js'; import { TILE } from './tiles.js';
export const newHazards = () => ({ gas: [], heatAcc: 0, inHeat: false });
export function armGasNear(h, m, x, y) { for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const gx = x+dx, gy = y+dy;
  if (gx >= 0 && gy >= 0 && gx < m.w && gy < m.h && m.get(gx, gy) === TILE.GAZ && !h.gas.some(g => g.x === gx && g.y === gy)) h.gas.push({ x: gx, y: gy, t: 0 }); } }
export function advanceGas(h, m, dt) { const out = []; for (const g of h.gas) g.t += dt;
  for (const g of h.gas.filter(g => g.t >= CFG.WARN_S)) { m.set(g.x, g.y, TILE.VIDE); out.push({ x: g.x, y: g.y }); }
  h.gas = h.gas.filter(g => g.t < CFG.WARN_S); return out; }
export function heatTick(h, rig, row, dt) { const hot = row > CFG.HEAT_ROW, entered = hot && !h.inHeat; h.inHeat = hot;
  if (!hot || rig.upgrades.has('isolation')) { h.heatAcc = 0; return { entered, dmg: 0 }; }
  h.heatAcc += dt; let dmg = 0; while (h.heatAcc >= CFG.HEAT_PERIOD_S) { h.heatAcc -= CFG.HEAT_PERIOD_S; dmg += CFG.HEAT_DMG; } return { entered, dmg }; }
```
```js
// src/core/knowledge.js
import { CFG } from './config.js';
export const newKnowledge = m => new Uint8Array(m.w * m.h);
export function reveal(k, m, cx, cy, r = CFG.REVEAL_RADIUS) { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
  if (x >= 0 && y >= 0 && x < m.w && y < m.h && Math.abs(x - cx) + Math.abs(y - cy) <= r) k[m.idx(x, y)] = 1; }
export function survey(k, m, rig, cx, cy, still) { if (!still || rig.fuel < CFG.SURVEY_FUEL) return false; rig.fuel -= CFG.SURVEY_FUEL;
  for (let y = cy + 1; y <= cy + CFG.SURVEY_DEPTH && y < m.h; y++) k[m.idx(cx, y)] = 1; return true; }
export const returnReserve = depthRows => Math.ceil(3 * depthRows * CFG.RESERVE_FACTOR); // spec : 3 × profondeur × 1,25 ; 40 rangées → 150
```
```js
// src/core/input.js
export const KEYMAP = Object.freeze({ KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right', KeyS:'down', ArrowDown:'down', KeyW:'thrust', ArrowUp:'thrust', Space:'thrust', Escape:'pause', KeyP:'pause', KeyM:'mute', KeyR:'survey' });
export const newInput = () => new Map();
export function press(i, a, src) { if (!i.has(a)) i.set(a, new Set()); i.get(a).add(src); }
export function release(i, a, src) { i.get(a)?.delete(src); }
export const releaseAll = i => i.clear();
export const isDown = (i, a) => (i.get(a)?.size ?? 0) > 0;
```
```js
// src/core/prefs.js
const KEY = 'fb.prefs'; const DEF = { music: true, volume: 0.6, tutorialDone: false, best: 0 };
export function loadPrefs(s) { try { return { ...DEF, ...(JSON.parse(s.getItem(KEY)) ?? {}) }; } catch { return { ...DEF }; } }
export function savePrefs(s, p) { try { s.setItem(KEY, JSON.stringify(p)); } catch { /* stockage refusé : on continue sans */ } }
export function recordScore(p, run, sc) { if (run.tutorial || sc <= p.best) return false; p.best = sc; return true; }
```
- [ ] **Étape 4 :** RÉUSSITE, puis commit local.

### Tâche 7 : Scène Phaser, boucle à pas fixe, foreuse, terrain et physique

**Fichiers :** `src/game/main.js`, `src/game/MineScene.js`, `src/game/loop.js` ; test `test/loop.test.js` (la boucle est pure).

**Interfaces :**
- `makeStepper(stepFn:(dt)=>void, hz=60, maxSub=4): (frameDt:number)=>number` (renvoie le nombre de sous-pas ; abandonne le retard en trop) ; `stepper.reset()`
- `MineScene` (Phaser.Scene) : `init({seed, tutorial})`, `create()`, `update(time, delta)`, `fixedStep(dt)`

- [ ] **Étape 1 : test qui échoue `test/loop.test.js`**
```js
import { test } from 'node:test'; import assert from 'node:assert/strict'; import { makeStepper } from '../src/game/loop.js';
test('pas fixe 60 Hz et plafond de 4 sous-pas', () => { let n = 0; const s = makeStepper(() => n++);
  assert.equal(s(1/60), 1); assert.equal(s(1), 4); assert.equal(n, 5); s.reset(); assert.equal(s(0.5/60), 0); });
```
- [ ] **Étape 2 :** ÉCHEC → implémenter :
```js
// src/game/loop.js
export function makeStepper(stepFn, hz = 60, maxSub = 4) { const dt = 1 / hz; let acc = 0;
  const s = frameDt => { acc += frameDt; let n = 0; while (acc >= dt && n < maxSub) { stepFn(dt); acc -= dt; n++; } if (n === maxSub) acc = 0; return n; };
  s.reset = () => { acc = 0; }; return s; }
```
→ RÉUSSITE.
- [ ] **Étape 3 : `main.js`.** Configuration Phaser : `type: Phaser.AUTO`, `scale: { mode: Phaser.Scale.RESIZE }`, `physics: { default:'matter', matter:{ gravity:{y:1}, autoUpdate:false } }`, scènes `[MineScene]`. La graine vient de `seedFromUrl(location.search) ?? randomSeed()`.
- [ ] **Étape 4 : `MineScene`, éléments obligatoires (code à écrire dans le fichier) :**
  - `update(_, delta)` appelle `this.stepper(Math.min(delta, 250)/1000)` seulement si `!run.paused && !run.workshopOpen && run.status==='play'`. `fixedStep(dt)` appelle `this.matter.world.step(dt*1000)`, puis les règles pures dans cet ordre : entrées → forage → `fuelDrain` → `advanceWarnings` → `advanceGas` → `heatTick` → pépites → `checkEnd` → `tick`.
  - Terrain : un `Graphics` par morceau 8×8 (rectangles couleur de strate, fissures pour `MEUBLE`, bulles pour `GAZ` connu, minerai seulement si `knowledge` = 1). Collisions : pour chaque rangée d'un morceau, on fusionne les suites de tuiles solides en un rectangle Matter statique. On reconstruit seulement le morceau touché (`rebuildChunk(cx, cy)`).
  - Foreuse : `this.matter.add.rectangle(x, y, 28, 28, { chamfer:{radius:6}, inertia: Infinity, friction: 0.1 })`. On impose la vitesse horizontale à `TRACK_SPEED × speedFactor × 32` px/s. Le propulseur impose une vitesse verticale de −`THRUST_SPEED×32` si `canThrust`. Toutes les vitesses des corps sont plafonnées à `MAX_BODY_SPEED×32/60` px par pas.
  - Forage : si `left`/`right` est maintenu au sol contre une tuile solide, ou si `down` est maintenu, la progression de la tuile cible avance de `dt / drillTime(info.hardness, rig)`. Relâcher fige la progression (`this.drillProgress` est conservé par tuile cible et réinitialisé seulement si la cible change). À 1 : `onTileDrilled`, puis la tuile devient `VIDE` (minerai → `spawnNugget` ; Cœur → `pickHeart` ; bloc endormi → retiré), `afterDrill`, `armGasNear`, `rebuildChunk`. Une tuile non forable (`canDrillTile` faux) affiche « Mèche II requise » sans progresser.
  - Chutes : on mesure la hauteur depuis le dernier contact au sol et on applique `fallDamage` à l'atterrissage.
  - Blocs : `advanceWarnings` renvoie les cases à libérer ; pour chacune, on crée un corps Matter 32×32 dynamique. Dégâts de 15 si la vitesse relative dépasse 3 tuiles/s au contact de la foreuse. `trySettle` est appelé après 0,5 s de repos ou à 4 s d'âge ; `'sleeping'` → `Body.setStatic(true)`.
  - Pépites : cercles de 8 px dynamiques ; au contact, `pickNugget` puis `collect` ; `restTick` à chaque pas ; une pépite statique devient un dessin fixe (sans corps), ramassée au contact par test de chevauchement.
  - Plateforme du Poste (rangée 0, colonnes `shaftX-2..shaftX+2`) : contact au sol → `arriveAtPad` (une fois) et bouton « Atelier » visible ; départ → `leavePad`.
  - Caméra : `startFollow(rig, true, 0.1, 0.1)`, zone morte de 64 × 64 px, `setBounds(0, -128, W*32, H*32+128)`, zoom réglé pour ≈ 12 tuiles de large si la largeur est inférieure à 700 px, sinon 20.
  - `reveal(knowledge, mine, cellX, cellY)` à chaque pas où la cellule change.
- [ ] **Étape 5 : vérification visuelle** (aucun outil navigateur dans le Shell). L'exécutant **ne lance pas Playwright, CDP ni de navigateur dans le Shell** et ne suppose pas qu'un `localhost` est accessible au navigateur. Il demande à l'agent parent de faire un essai visuel avec son ordinateur ou son navigateur (ouvrir `index.html` servi selon la méthode que le parent sait accessible). Le parent vérifie : rouler, forer gauche/droite/bas en maintenant, monter un puits de 30 tuiles au propulseur, voir une roche fissurée trembler 2 s avant de tomber. Le résultat est noté tel quel ; aucune réussite n'est supposée.
- [ ] **Étape 6 :** `npm test` → RÉUSSITE, puis commit local.

### Tâche 8 : HUD, tactile, pause et carte, Atelier, entraînement, fins de partie, audio

**Fichiers :** `src/game/Hud.js`, `src/game/tutorial.js`, `src/game/audio.js` ; tests `test/tutorial.test.js`, `test/audioPolicy.test.js`.

**Interfaces :**
- `TUTORIAL_STEPS: {id, texte, done:(evt)=>boolean}[]` avec les ids `rouler, forerBas, ramasser, propulseur, eviterBloc, reculerGaz, vendre` ; `advanceTutorial(state, evt): state` ; `TUTORIAL_SEED = 20261106`
- `audioPolicy({musicPref:boolean, gestured:boolean, assetLoaded:boolean}): 'play'|'wait'|'silent'`

- [ ] **Étape 1 : tests qui échouent**
```js
// test/tutorial.test.js
import { test } from 'node:test'; import assert from 'node:assert/strict'; import { TUTORIAL_STEPS, advanceTutorial } from '../src/game/tutorial.js';
test('étapes dans l’ordre, chacune validée par une action', () => { let s = { i: 0 };
  assert.deepEqual(TUTORIAL_STEPS.map(t => t.id), ['rouler','forerBas','ramasser','propulseur','eviterBloc','reculerGaz','vendre']);
  s = advanceTutorial(s, { type: 'forer' }); assert.equal(s.i, 0); s = advanceTutorial(s, { type: 'rouler' }); assert.equal(s.i, 1); });
// test/audioPolicy.test.js
import { audioPolicy } from '../src/game/audio.js';
test('musique seulement après un geste, silence sans fichier', () => {
  assert.equal(audioPolicy({ musicPref:true, gestured:false, assetLoaded:true }), 'wait');
  assert.equal(audioPolicy({ musicPref:true, gestured:true, assetLoaded:true }), 'play');
  assert.equal(audioPolicy({ musicPref:true, gestured:true, assetLoaded:false }), 'silent');
  assert.equal(audioPolicy({ musicPref:false, gestured:true, assetLoaded:true }), 'silent'); });
```
Ces fichiers ne doivent pas importer Phaser au niveau du module : `audio.js` exporte `audioPolicy` pur et une classe `Audio` qui reçoit la scène en paramètre.
- [ ] **Étape 2 :** ÉCHEC → implémenter :
```js
// src/game/tutorial.js
export const TUTORIAL_SEED = 20261106;
export const TUTORIAL_STEPS = [
  { id:'rouler', texte:'Roule avec A/D ou les flèches.', done: e => e.type === 'rouler' },
  { id:'forerBas', texte:'Maintiens S ou ↓ pour forer vers le bas.', done: e => e.type === 'forer' && e.dir === 'down' },
  { id:'ramasser', texte:'Touche une pépite pour la ramasser.', done: e => e.type === 'ramasser' },
  { id:'propulseur', texte:'Maintiens W, ↑ ou Propulseur pour monter.', done: e => e.type === 'propulseur' },
  { id:'eviterBloc', texte:'La roche fissurée tremble 2 s : éloigne-toi.', done: e => e.type === 'blocEvite' },
  { id:'reculerGaz', texte:'Des bulles ? Le gaz siffle 2 s : recule.', done: e => e.type === 'gazEvite' },
  { id:'vendre', texte:'Reviens au Poste pour vendre.', done: e => e.type === 'vente' },
];
export const advanceTutorial = (s, e) => (s.i < TUTORIAL_STEPS.length && TUTORIAL_STEPS[s.i].done(e)) ? { i: s.i + 1 } : s;
```
```js
// src/game/audio.js
export const audioPolicy = ({ musicPref, gestured, assetLoaded }) => !musicPref || !assetLoaded ? 'silent' : (gestured ? 'play' : 'wait');
export class Audio { constructor(scene, prefs) { this.scene = scene; this.prefs = prefs; this.gestured = false; this.music = null; }
  loaded() { return this.scene.cache.audio.exists('musique'); }
  onGesture() { this.gestured = true; this.apply(); }
  apply() { const p = audioPolicy({ musicPref: this.prefs.music, gestured: this.gestured, assetLoaded: this.loaded() });
    if (p === 'play') { this.music ??= this.scene.sound.add('musique', { loop: true, volume: this.prefs.volume }); if (!this.music.isPlaying) this.music.play(); }
    else this.music?.stop(); } }
```
La v1 ne contient **aucun fichier audio**. `preload` charge `musique` seulement si `assets/manifest.json` le liste ; une erreur de chargement est ignorée, ce qui donne le silence. Aucun son n'est synthétisé.
- [ ] **Étape 3 : `Hud.js`, éléments obligatoires :**
  - Jauges carburant, coque et soute (ex. `7/10`), indicateur « Cœur ✓ », crédits, profondeur, **réserve de retour estimée** (orange si `fuel < returnReserve × 1`), temps joué marqué « informatif ». Alerte si le carburant est sous 25 %. Messages : « Mèche II requise », « Zone de chaleur », « Soute pleine ».
  - Tactile, en `DOM` ou dans un `Container` Phaser fixé à la caméra : croix gauche/droite/bas à gauche, **Propulseur** à droite, boutons Sonder, Pause et Son, chaque cible d'au moins 56 px. Chaque bouton appelle `press(input, action, 'p'+pointerId)` sur `pointerdown`, et `release` sur `pointerup`, `pointerout` et `pointercancel`.
  - `window.addEventListener('blur')` et `document.visibilitychange` (caché) → `releaseAll(input)`, `run.paused = true`, `stepper.reset()`.
  - Pause : panneau avec Reprendre, Carte, Entraînement, Abandonner et Son. La **Carte** dessine `knowledge` en mini-grille qu'on peut faire défiler (glisser ou flèches), pendant que la physique est figée.
  - Atelier (seulement sur la plateforme) : `run.workshopOpen = true` ; boutons Plein (`refuel`), Réparer (`repair`) et les 5 améliorations avec leur coût (désactivées si achetées ou trop chères) ; bouton Fermer.
  - Remorquage : bouton dans la pause, visible sous la surface. Il affiche « Coût 50 crédits, soute perdue » avant de confirmer, puis appelle `tow`, remet le Cœur à `mine.heart` si nécessaire et replace la foreuse sur la plateforme.
  - Écran de fin : statut, `score(run)`, graine, « Rejouer cette mine » (même graine, `history.replaceState` avec `urlForSeed`) et « Nouvelle mine » (`randomSeed`). Appel de `recordScore`, puis `savePrefs`, **seulement si `!run.tutorial`**.
  - Menu de départ : Jouer, Entraînement (graine `TUTORIAL_SEED`, `tutorial:true`, bouton Passer) et Son. `prefs.tutorialDone = true` à la fin ou quand on passe l'entraînement.
- [ ] **Étape 4 :** `npm test` → RÉUSSITE. Essai visuel par le parent (même règle qu'à la tâche 7, étape 5) : HUD lisible en français, Atelier qui fige la physique, pause et carte, fin de partie, Son. Commit local.

### Tâche 9 : Balayage des graines (preuve automatisée)

**Fichiers :** `tools/seedSweep.js` ; test `test/sweep.test.js` (version de 100 graines pour l'intégration continue locale).

- [ ] **Étape 1 :** `tools/seedSweep.js` génère les graines 1 à 1 000 et vérifie les mêmes assertions que la tâche 2 (Cœur atteignable, 80 % de la valeur, minerais de départ, 2 descentes, puits). Il affiche `OK n/1000` ou la liste des graines en échec, avec un code de sortie 1 en cas d'échec.
```js
import { generateMine } from '../src/core/mineGen.js'; import { checkMine } from '../test/helpers/checkMine.js';
const bad = []; for (let s = 1; s <= 1000; s++) { const e = checkMine(generateMine(s)); if (e) bad.push(`${s}: ${e}`); }
console.log(bad.length ? bad.join('\n') : 'OK 1000/1000'); process.exit(bad.length ? 1 : 0);
```
`test/helpers/checkMine.js` exporte `checkMine(mine): string|null`, avec les assertions de la tâche 2 réunies là. Il faut aussi **refactoriser `test/mineGen.test.js`** pour qu'il l'utilise (une seule source de vérité).
- [ ] **Étape 2 :** `npm run sweep` → le résultat réel est consigné dans le rapport. S'il y a des échecs, on corrige la génération et on relance.

### Tâche 10 : Faisabilité économique et stabilité physique (hypothèses mesurées)

**Fichiers :** `tools/feasibility.js` ; rapport `docs/validation.md`.

- [ ] **Étape 1 : bot de faisabilité sur la grille (sans Matter).** Pour chacune des 20 graines `1001..1020`, un bot glouton joue avec les règles pures : il descend par le chemin BFS le plus court vers le minerai connu le plus rentable, remonte quand `fuel <= returnReserve(depth)` ou que la soute est pleine, vend, achète dans l'ordre Réservoir+ → Soute+ → Mèche II → Blindage → Isolation, puis vise le Cœur. Le coût de déplacement est modélisé : 1 carburant par tuile horizontale, 3 × (1/4 s par tuile) en montée, 2 par tuile forée. Il affiche par graine : victoire oui/non, remorquages, carburant minimal.
- [ ] **Étape 2 :** consigner dans `docs/validation.md` : « Modèle simplifié, sans physique ; une réussite du bot **suggère** la faisabilité, elle ne la prouve pas. » Si moins de 18 graines sur 20 sont gagnées, proposer un ajustement des valeurs de `config.js` dans le rapport. **Ne pas changer les valeurs sans accord**, car elles font partie de la spec approuvée.
- [ ] **Étape 3 : stabilité physique (manuel, par le parent).** Mine de test `?seed=…&debug=collapse` : le mode debug fait tomber 12 blocs toutes les 5 s pendant 5 min, avec un compteur d'images par seconde à l'écran. Le parent note ce qu'il observe (corps éjectés, traversée de tuiles, nombre de corps, IPS sur sa machine). Le résultat est noté tel quel.
- [ ] **Étape 4 : mobile.** Le parent essaie l'émulation mobile de son navigateur si elle est disponible. Le rapport indique explicitement : **« test sur un vrai téléphone à faire par Pascal »**.

### Tâche 11 : README.md et GAME.md

- [ ] **README.md** : description en deux lignes ; inspiration *Drillers* de CGE (concept seulement, rien de réutilisé) ; prérequis (Node ≥ 20 pour les tests) ; `npm test`, `npm run sweep`, `npm run feasibility` ; lancement local (servir le dossier en statique, par exemple `npx serve .`, sans promettre une URL accessible) ; structure des dossiers ; Phaser 3.90.0 sous licence MIT ; « Graphismes temporaires en formes géométriques ; illustrations (Créa) et musique (SUNO) prévues plus tard » ; statut de validation (lien vers `docs/validation.md`).
- [ ] **GAME.md** (pour Pascal, en français québécois) : le but (ramener le Cœur boréal), les contrôles clavier et tactiles, carburant / coque / soute / Cœur, la réserve de retour (estimation, pas une garantie), la roche fissurée et le gaz (annonces de 2 s), la chaleur, le Poste et l'Atelier, le remorquage, le score (minerais vendus + 500 − 25 par remorquage, sans vitesse), l'absence de limite de temps et de sauvegarde en cours de partie, le sondage, les graines (`?seed=`).
- [ ] Commit local `docs: README et GAME`.

### Tâche 12 : Publication (CONDITIONNELLE, autorisation explicite requise)

**Ne rien faire de cette tâche sans un accord explicite de Pascal** pour : (a) créer un dépôt GitHub (nom à confirmer, par exemple `passcool17/foreuse-boreale`) et l'inscrire dans `/workspace/games/CLAIMS.md`, (b) pousser, (c) activer GitHub Pages.
- [ ] Une fois autorisé : créer le dépôt, faire un push normal (jamais de force-push), activer Pages depuis `main` (racine).
- [ ] Vérifier que le déploiement a réussi (run Actions **terminé avec succès**), puis ouvrir l'URL réelle et confirmer que la page charge la version du commit.
- [ ] Aucune PR ni URL inventée, pas de fusion automatique. Le lien n'est communiqué qu'après vérification.

---

## Auto-révision (faite)
- **Couverture de la spec :** §0 pivot (contraintes globales, T4 sans chrono, T7 forage par maintien, T5/T6 annonces de 2 s) ; §2 périmètre (exclusions respectées, aucune tâche hors périmètre) ; §3 boucle (T3, T4, T7) ; §4 génération, lecture, sondage, routes (T2, T6, T7, T9) ; §5 foreuse et caméra (T3, T7) ; §6 physique bornée, re-figement sûr, plafonds, pas fixe (T5, T7, T10) ; §7 ressources, réserve, remorquage, dangers (T3, T4, T6) ; §8 économie et Poste/Atelier (T4, T8) ; §9 fins et score (T4, T8) ; §10 graines et URL (T4, T8) ; §11 interface, clavier, tactile, relâchements, pause (T6, T8) ; §12 préférences sans sauvegarde de partie (T6) ; §13 entraînement sans record (T6, T8) ; §14 audio silence et art primitif (T8, T11) ; §15 unités (structure des fichiers) ; §16 tests (T2–T10) ; §17 compromis (README, GAME).
- **Placeholders :** aucun « TODO » ni « à déterminer ». `returnReserve` suit exactement la formule de la spec.
- **Cohérence des types :** `newRig`, `newRun`, `arriveAtPad`, `trySettle(c, m, block, cell, occupied, rigCell)`, `returnReserve(depthRows)`, `press(i, action, source)` et `KEYMAP` sont nommés de la même façon dans toutes les tâches.
- **Écarts relevés, non bloquants, signalés sans modifier la spec :** (1) la spec ne donne la durée de forage du granite qu'avec la Mèche II ; le plan garde 1,0 s comme valeur de base provisoire. (2) Une touche Sonder (R) est ajoutée au clavier ; la spec mentionne le bouton Sonder sans lui donner de touche.
