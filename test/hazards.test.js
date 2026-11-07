import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMine } from '../src/core/mineGen.js';
import { TILE } from '../src/core/tiles.js';
import * as H from '../src/core/hazards.js';
import { newRig } from '../src/core/rig.js';

test('gaz annoncé 2 s puis explosion', () => {
  const m = makeMine(1, 8, 8);
  m.tiles.fill(TILE.TOURBE);
  m.set(4, 4, TILE.GAZ);
  const h = H.newHazards();
  H.armGasNear(h, m, 3, 4);
  assert.equal(h.gas.length, 1);
  assert.deepEqual(H.advanceGas(h, m, 1.9), []);
  assert.equal(m.get(4, 4), TILE.GAZ);
  assert.deepEqual(H.advanceGas(h, m, 0.2), [{ x: 4, y: 4 }]);
  assert.equal(m.get(4, 4), TILE.VIDE);
});

test('forer la poche elle-même l’arme sans dégât immédiat', () => {
  const m = makeMine(1, 8, 8);
  m.tiles.fill(TILE.TOURBE);
  m.set(4, 4, TILE.GAZ);
  const h = H.newHazards();
  H.armGasCell(h, 4, 4);
  assert.equal(h.gas.length, 1);
  assert.deepEqual(H.advanceGas(h, m, 1.9), []);
  assert.equal(m.get(4, 4), TILE.GAZ);
});

test('chaleur annoncée à l’entrée puis 1 dégât / 2 s, Isolation protège', () => {
  const h = H.newHazards();
  const r = newRig();
  assert.equal(H.heatTick(h, r, 151, 0).entered, true);
  assert.equal(H.heatTick(h, r, 151, 2).dmg, 1);
  assert.equal(H.heatTick(h, r, 150, 2).dmg, 0);
  assert.equal(H.heatTick(h, r, 151, 0).entered, true);
  r.upgrades.add('isolation');
  assert.equal(H.heatTick(h, r, 151, 2).dmg, 0);
});

test('rayon d’explosion 1 (Chebyshev)', () => {
  assert.equal(H.inBlast(4, 4, 4, 4), true);
  assert.equal(H.inBlast(4, 4, 5, 5), true);
  assert.equal(H.inBlast(4, 4, 6, 4), false);
});
