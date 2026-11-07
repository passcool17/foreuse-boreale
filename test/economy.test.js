import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES, drillTime, canDrillTile } from '../src/core/economy.js';
import { newRig } from '../src/core/rig.js';
import { TILE, TILE_INFO } from '../src/core/tiles.js';

test('coûts d’amélioration de la spec', () => {
  assert.equal(UPGRADES.reservoir.cost, 120);
  assert.equal(UPGRADES.soute.cost, 150);
  assert.equal(UPGRADES.meche2.cost, 250);
  assert.equal(UPGRADES.blindage.cost, 200);
  assert.equal(UPGRADES.isolation.cost, 300);
});

test('mèche II accélère de 30 %', () => {
  const r = newRig();
  assert.equal(drillTime(1, r), 1);
  r.upgrades.add('meche2');
  assert.ok(Math.abs(drillTime(1, r) - 0.7) < 1e-9);
});

test('roche dure sans mèche', () => {
  const r = newRig();
  assert.equal(canDrillTile(TILE_INFO[TILE.DURE], r), false);
  assert.equal(canDrillTile(TILE_INFO[TILE.ROCMERE], r), false);
  r.upgrades.add('meche2');
  assert.equal(canDrillTile(TILE_INFO[TILE.DURE], r), true);
  assert.equal(canDrillTile(TILE_INFO[TILE.ROCMERE], r), false);
});
