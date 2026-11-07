import { makeMine } from './mineGen.js';
import { TILE } from './tiles.js';
import { TUTORIAL_SEED } from '../game/tutorial.js';

export const TUTORIAL_LAYOUT = Object.freeze({
  loose: { x: 13, y: 3 },
  keystone: { x: 13, y: 4 },
  gas: { x: 16, y: 4 },
  copper: { x: 6, y: 2 },
});

/** Mini-mine fixe pour l'entraînement. Aucun record n'y est lié. */
export function tutorialMine() {
  const w = 22;
  const h = 14;
  const m = makeMine(TUTORIAL_SEED, w, h);
  m.shaftX = 6;
  m.heart = { x: 0, y: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === h - 1) m.set(x, y, TILE.ROCMERE);
      else if (y === 0) m.set(x, y, TILE.VIDE);
      else m.set(x, y, TILE.TOURBE);
    }
  }
  for (let x = 6; x <= 12; x++) m.set(x, 4, TILE.VIDE);
  const L = TUTORIAL_LAYOUT;
  m.set(L.copper.x, L.copper.y, TILE.CUIVRE);
  m.set(L.loose.x, L.loose.y, TILE.MEUBLE);
  m.set(L.loose.x - 1, L.loose.y, TILE.VIDE);
  m.set(L.loose.x + 1, L.loose.y, TILE.VIDE);
  m.set(L.keystone.x, L.keystone.y, TILE.TOURBE);
  m.set(14, 4, TILE.TOURBE);
  m.set(15, 4, TILE.TOURBE);
  m.set(L.gas.x, L.gas.y, TILE.GAZ);
  return m;
}
