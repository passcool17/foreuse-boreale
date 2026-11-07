import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMine } from '../src/core/mineGen.js';
import { newRig } from '../src/core/rig.js';
import * as K from '../src/core/knowledge.js';

test('révélation rayon 3 mémorisée', () => {
  const m = makeMine(1, 20, 20);
  const k = K.newKnowledge(m);
  K.reveal(k, m, 10, 10);
  assert.equal(k[m.idx(13, 10)], 1);
  assert.equal(k[m.idx(14, 10)], 0);
  assert.equal(k[m.idx(10, 13)], 1);
  assert.equal(k[m.idx(12, 12)], 0);
});

test('sondage : immobile, 3 carburant, 8 tuiles', () => {
  const m = makeMine(1, 20, 30);
  const k = K.newKnowledge(m);
  const r = newRig();
  assert.equal(K.survey(k, m, r, 5, 5, false), false);
  assert.equal(r.fuel, 100);
  assert.ok(K.survey(k, m, r, 5, 5, true));
  assert.equal(r.fuel, 97);
  assert.equal(k[m.idx(5, 13)], 1);
  assert.equal(k[m.idx(5, 14)], 0);
  assert.equal(k[m.idx(5, 6)], 1);
  r.fuel = 2;
  assert.equal(K.survey(k, m, r, 5, 5, true), false);
  assert.equal(r.fuel, 2);
});

test('réserve prudente', () => {
  assert.equal(K.returnReserve(40), 150);
  assert.equal(K.returnReserve(0), 0);
});
