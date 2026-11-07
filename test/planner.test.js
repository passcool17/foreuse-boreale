import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateMine, emptyMine } from '../tools/feasibility.js';
import { TILE } from '../src/core/tiles.js';
import { CFG } from '../src/core/config.js';

test('puits sans minerai : le premier voyage ne paie pas, le Cœur revient quand même', () => {
  const mine = emptyMine(12, 70, 6, { x: 6, y: 48 });
  const r = simulateMine(mine, { seed: 1, stepCap: 4000 });
  assert.equal(r.conservation.ok, true);
  assert.equal(r.vendu, 0);
  assert.equal(r.victoire, true, `${r.raison} y=${r.y} fuel=${r.fuel} crédits=${r.credits} étapes=${r.etapes}`);
  assert.ok(r.carburantBrule > 62, 'le forage du puits est bien payé');
  assert.ok(!r.ameliorations.includes('meche2'));
});

test('cuivre à deux pas du puits : sans ce détour le second plein manque', () => {
  const mine = emptyMine(20, 80, 6, { x: 6, y: 58 });
  for (let i = 0; i < 8; i++) mine.set(8 + i, 3, TILE.CUIVRE);
  const r = simulateMine(mine, { seed: 3, stepCap: 8000 });
  assert.equal(r.conservation.ok, true);
  assert.ok(r.vendu >= 80, `vendu ${r.vendu}`);
  assert.equal(r.victoire, true, `${r.raison} y=${r.y} maxY=${r.maxY} fuel=${r.fuel} crédits=${r.credits} vendu=${r.vendu}`);
});

test('couloir plus long qu’un plein : on rentre au Poste, on ne reste pas coincé', () => {
  const mine = emptyMine(96, 6, 2, { x: 90, y: 1 });
  const r = simulateMine(mine, { seed: 2, stepCap: 5000 });
  assert.equal(r.conservation.ok, true);
  assert.equal(r.y, 0, `${r.raison} x=${r.x} fuel=${r.fuel}`);
  assert.notEqual(r.raison, 'bloque');
  assert.ok(r.carburantBrule > 0);
});
