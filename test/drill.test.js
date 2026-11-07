import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDrill, tickDrill } from '../src/core/drill.js';

test('maintenir avance, relâcher conserve, changer de cible remet à zéro', () => {
  let s = createDrill();
  s = tickDrill(s, { x: 2, y: 3 }, 0.2, 1, true);
  assert.ok(Math.abs(s.p - 0.2) < 1e-9);
  assert.equal(s.done, false);
  const held = s.p;
  s = tickDrill(s, { x: 2, y: 3 }, 5, 1, false);
  assert.equal(s.p, held);
  s = tickDrill(s, { x: 2, y: 3 }, 0.9, 1, true);
  assert.equal(s.done, true);
  s = createDrill();
  s = tickDrill(s, { x: 1, y: 1 }, 0.4, 1, true);
  s = tickDrill(s, { x: 4, y: 1 }, 0.1, 1, true);
  assert.ok(Math.abs(s.p - 0.1) < 1e-9);
});

test('tuile non forable : pas de progression', () => {
  let s = createDrill();
  s = tickDrill(s, { x: 1, y: 1 }, 0.5, 1, true);
  s = tickDrill(s, { x: 1, y: 1 }, 1, 1, true, false);
  assert.equal(s.p, 0.5);
  assert.equal(s.blocked, true);
});
