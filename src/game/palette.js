import { TILE, TILE_INFO, stratumTile } from '../core/tiles.js';

export const FILL = Object.freeze({
  [TILE.VIDE]: 0x12181c,
  [TILE.TOURBE]: 0x6e4b2a,
  [TILE.ARGILE]: 0x8d6846,
  [TILE.GRANITE]: 0x6d7480,
  [TILE.GLACE]: 0x6f9eae,
  [TILE.MEUBLE]: 0xb08958,
  [TILE.DURE]: 0x3c4452,
  [TILE.ROCMERE]: 0x1c1824,
  [TILE.CUIVRE]: 0xd07a3a,
  [TILE.ARGENT]: 0xd5dbe6,
  [TILE.OR]: 0xe6c15a,
  [TILE.CRISTAL]: 0x7ee0d0,
  [TILE.GAZ]: 0x2f6f68,
  [TILE.COEUR]: 0xff4d6a,
});

export function appearance(tile, y, known) {
  const secret = tile === TILE.GAZ || tile === TILE.COEUR || TILE_INFO[tile].value > 0;
  const shown = !known && secret ? stratumTile(y) : tile;
  return {
    color: FILL[shown] ?? FILL[TILE.TOURBE],
    cracks: tile === TILE.MEUBLE,
    hatch: tile === TILE.DURE,
    bubbles: tile === TILE.GAZ && !!known,
    heart: tile === TILE.COEUR && !!known,
    ore: !!known && TILE_INFO[tile].value > 0,
  };
}

export function nuggetColor(value) {
  if (value >= 150) return FILL[TILE.CRISTAL];
  if (value >= 60) return FILL[TILE.OR];
  if (value >= 25) return FILL[TILE.ARGENT];
  return FILL[TILE.CUIVRE];
}

export function cssColor(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}
