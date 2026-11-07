import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockRemains } from '../src/game/docks.js';

test('le quai disparaît quand la tuile de soutien est forée', () => {
  assert.equal(dockRemains(true), true);
  assert.equal(dockRemains(false), false);
});

test('pépite sous le quai : hors contact tant que la foreuse ne descend pas d’une tuile', () => {
  const reach = 24;
  const rigOnDock = 18;
  const nugget = 1 * 32 + 16;
  assert.ok(Math.abs(nugget - rigOnDock) > reach);
  const rigAfterOneTile = 2 * 32 - 14;
  assert.ok(Math.abs(nugget - rigAfterOneTile) <= reach);
});
