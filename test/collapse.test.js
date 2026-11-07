import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMine } from '../src/core/mineGen.js';
import { TILE } from '../src/core/tiles.js';
import * as C from '../src/core/collapse.js';

function box() {
  const m = makeMine(1, 10, 10);
  m.tiles.fill(TILE.TOURBE);
  m.heart = { x: 0, y: 0 };
  return m;
}

test('rien à la génération : seul le forage déclenche', () => {
  const c = C.newCollapse();
  assert.equal(c.warnings.length, 0);
  assert.equal(c.blocks.length, 0);
});

test('roche meuble sans support → annonce 2 s puis chute', () => {
  const m = box();
  m.set(5, 4, TILE.MEUBLE);
  m.set(5, 5, TILE.VIDE);
  m.set(4, 4, TILE.VIDE);
  const c = C.newCollapse();
  C.afterDrill(c, m, 5, 5);
  assert.equal(c.warnings.length, 1);
  assert.deepEqual(C.advanceWarnings(c, m, 1.9), []);
  assert.equal(m.get(5, 4), TILE.MEUBLE);
  assert.deepEqual(C.advanceWarnings(c, m, 0.2), [{ x: 5, y: 4 }]);
  assert.equal(m.get(5, 4), TILE.VIDE);
  assert.equal(c.blocks.length, 1);
  assert.equal(c.blocks[0].state, 'falling');
});

test('support latéral double = stable', () => {
  const m = box();
  m.set(5, 4, TILE.MEUBLE);
  m.set(5, 5, TILE.VIDE);
  const c = C.newCollapse();
  C.afterDrill(c, m, 5, 5);
  assert.equal(C.supported(m, 5, 4), true);
  assert.equal(c.warnings.length, 0);
});

test('un soutien revenu annule l’annonce', () => {
  const m = box();
  m.set(5, 4, TILE.MEUBLE);
  m.set(5, 5, TILE.VIDE);
  m.set(4, 4, TILE.VIDE);
  const c = C.newCollapse();
  C.afterDrill(c, m, 5, 5);
  m.set(5, 5, TILE.TOURBE);
  assert.deepEqual(C.advanceWarnings(c, m, 2.1), []);
  assert.equal(c.warnings.length, 0);
  assert.equal(m.get(5, 4), TILE.MEUBLE);
});

test('plafond 12 : file d’attente', () => {
  const m = box();
  m.set(2, 2, TILE.MEUBLE);
  m.set(2, 3, TILE.VIDE);
  m.set(1, 2, TILE.VIDE);
  const c = C.newCollapse();
  for (let i = 0; i < 12; i++) c.blocks.push({ id: i, x: 0, y: 0, state: 'falling', restS: 0, ageS: 0 });
  c.warnings.push({ x: 2, y: 2, t: 2 });
  assert.deepEqual(C.advanceWarnings(c, m, 0.1), []);
  assert.equal(c.queue.length, 1);
  assert.equal(m.get(2, 2), TILE.MEUBLE);
});

test('re-figement jamais sur la foreuse/Cœur/pépite ni enfermement', () => {
  const m = box();
  m.tiles.fill(TILE.VIDE);
  const c = C.newCollapse();
  const b = { id: 1, x: 3, y: 3, state: 'falling', restS: 0, ageS: 0 };
  c.blocks.push(b);
  assert.equal(C.trySettle(c, m, b, { x: 3, y: 3 }, () => false, { x: 3, y: 3 }), 'sleeping');
  m.heart = { x: 3, y: 3 };
  assert.equal(C.trySettle(c, m, b, { x: 3, y: 3 }, () => false, { x: 8, y: 8 }), 'sleeping');
  m.heart = { x: 0, y: 0 };
  assert.equal(C.trySettle(c, m, b, { x: 3, y: 3 }, (x, y) => x === 3 && y === 3, { x: 8, y: 8 }), 'sleeping');
  m.tiles.fill(TILE.TOURBE);
  m.set(4, 3, TILE.VIDE);
  m.set(3, 3, TILE.VIDE);
  assert.equal(C.trySettle(c, m, b, { x: 3, y: 3 }, () => false, { x: 4, y: 3 }), 'sleeping', 'enfermerait la foreuse');
  m.set(5, 3, TILE.VIDE);
  assert.equal(C.trySettle(c, m, b, { x: 3, y: 3 }, () => false, { x: 4, y: 3 }), 'tile');
  assert.equal(m.get(3, 3), TILE.TOURBE);
  assert.equal(c.blocks.includes(b), false);
});
