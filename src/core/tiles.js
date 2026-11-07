import { CFG } from './config.js';

export const TILE = Object.freeze({
  VIDE: 0,
  TOURBE: 1,
  ARGILE: 2,
  GRANITE: 3,
  GLACE: 4,
  MEUBLE: 5,
  DURE: 6,
  ROCMERE: 7,
  CUIVRE: 8,
  ARGENT: 9,
  OR: 10,
  CRISTAL: 11,
  GAZ: 12,
  COEUR: 13,
});

const S = (hardness, extra = {}) => ({
  hardness, solid: true, drillable: true, needsBit2: false, value: 0, ...extra,
});

export const TILE_INFO = Object.freeze({
  [TILE.VIDE]: { hardness: 0, solid: false, drillable: false, needsBit2: false, value: 0 },
  [TILE.TOURBE]: S(0.35),
  [TILE.ARGILE]: S(0.6),
  [TILE.GRANITE]: S(1.0),
  [TILE.GLACE]: S(1.0),
  [TILE.MEUBLE]: S(0.35),
  [TILE.DURE]: S(1.0, { needsBit2: true }),
  [TILE.ROCMERE]: S(Infinity, { drillable: false }),
  [TILE.CUIVRE]: S(0.6, { value: 10 }),
  [TILE.ARGENT]: S(0.6, { value: 25 }),
  [TILE.OR]: S(1.0, { value: 60 }),
  [TILE.CRISTAL]: S(1.0, { value: 150 }),
  [TILE.GAZ]: S(0.35),
  [TILE.COEUR]: S(1.0),
});

export const STRATA = Object.freeze([TILE.TOURBE, TILE.ARGILE, TILE.GRANITE, TILE.GLACE]);

export const isOre = (t) => TILE_INFO[t].value > 0;

/** Indice de strate 0..3. La rangée 0 (surface) est traitée comme la tourbe. */
export function stratumIndex(y) {
  if (y <= 0) return 0;
  return Math.min(3, Math.floor((y - 1) / CFG.STRATUM_ROWS));
}

export const stratumTile = (y) => STRATA[stratumIndex(y)];

export const TILE_LABEL = Object.freeze({
  [TILE.VIDE]: 'Galerie',
  [TILE.TOURBE]: 'Tourbe',
  [TILE.ARGILE]: 'Argile',
  [TILE.GRANITE]: 'Granite',
  [TILE.GLACE]: 'Glace ancienne',
  [TILE.MEUBLE]: 'Roche fissurée',
  [TILE.DURE]: 'Roche dure',
  [TILE.ROCMERE]: 'Roc-mère',
  [TILE.CUIVRE]: 'Cuivre',
  [TILE.ARGENT]: 'Argent',
  [TILE.OR]: 'Or',
  [TILE.CRISTAL]: 'Cristal boréal',
  [TILE.GAZ]: 'Poche de gaz',
  [TILE.COEUR]: 'Cœur boréal',
});
