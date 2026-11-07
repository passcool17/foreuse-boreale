import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMine } from '../src/core/mineGen.js';
import { TILE } from '../src/core/tiles.js';
import { checkMine } from './helpers/checkMine.js';

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 1);

test('déterminisme', () => {
  const a = generateMine(99);
  const b = generateMine(99);
  assert.deepEqual(a.tiles, b.tiles);
  assert.deepEqual(a.heart, b.heart);
  assert.equal(a.shaftX, b.shaftX);
});

test('bordures en roc-mère, surface vide', () => {
  const m = generateMine(5);
  for (let y = 0; y < m.h; y++) {
    assert.equal(m.get(0, y), TILE.ROCMERE);
    assert.equal(m.get(m.w - 1, y), TILE.ROCMERE);
  }
  for (let x = 1; x < m.w - 1; x++) assert.equal(m.get(x, 0), TILE.VIDE);
});

for (const s of SEEDS) {
  test(`topologie graine ${s}`, () => {
    const err = checkMine(generateMine(s));
    assert.equal(err, null, err ?? '');
  });
}
