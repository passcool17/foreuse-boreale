import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialMine, TUTORIAL_LAYOUT } from '../src/core/tutorialMine.js';
import { TILE } from '../src/core/tiles.js';
import { supported } from '../src/core/collapse.js';
import { TUTORIAL_SEED } from '../src/game/tutorial.js';

test('mini-mine fixe : cuivre, roche soutenue, gaz à l’écart du départ', () => {
  const m = tutorialMine();
  assert.equal(m.seed, TUTORIAL_SEED);
  assert.equal(m.get(m.shaftX, 0), TILE.VIDE);
  assert.equal(m.get(m.shaftX, 2), TILE.CUIVRE);
  const { loose, keystone, gas } = TUTORIAL_LAYOUT;
  assert.equal(m.get(loose.x, loose.y), TILE.MEUBLE);
  assert.equal(supported(m, loose.x, loose.y), true);
  m.set(keystone.x, keystone.y, TILE.VIDE);
  assert.equal(supported(m, loose.x, loose.y), false);
  assert.equal(m.get(gas.x, gas.y), TILE.GAZ);
  assert.ok(Math.abs(gas.x - m.shaftX) >= 4);
});
