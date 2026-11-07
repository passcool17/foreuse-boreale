import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/core/pickups.js';

test('pépite statique après 6 s, conservée, ramassable', () => {
  const p = P.newPickups();
  const n = P.spawnNugget(p, 25, 1, 1);
  P.restTick(p, n.id, true, 5.9);
  assert.equal(p.dynamic.length, 1);
  P.restTick(p, n.id, true, 0.2);
  assert.equal(p.static.length, 1);
  assert.equal(p.dynamic.length, 0);
  assert.equal(P.collect(p, n.id).value, 25);
  assert.equal(p.static.length, 0);
});

test('le mouvement remet le repos à zéro', () => {
  const p = P.newPickups();
  const n = P.spawnNugget(p, 10, 0, 0);
  P.restTick(p, n.id, true, 5);
  P.restTick(p, n.id, false, 1);
  P.restTick(p, n.id, true, 5.9);
  assert.equal(p.dynamic.length, 1);
});

test('plafond 40 : la plus ancienne devient statique', () => {
  const p = P.newPickups();
  for (let i = 0; i < 41; i++) P.spawnNugget(p, 10, i, 0);
  assert.equal(p.dynamic.length, 40);
  assert.equal(p.static.length, 1);
  assert.equal(p.static[0].x, 0);
});

test('collecte manquée si id inconnu', () => {
  const p = P.newPickups();
  assert.equal(P.collect(p, 999), null);
});
