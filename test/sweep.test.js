import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMine } from '../src/core/mineGen.js';
import { checkMine } from './helpers/checkMine.js';

test('100 graines : topologie, départ, soutiens', () => {
  const bad = [];
  for (let s = 1; s <= 100; s++) {
    const e = checkMine(generateMine(s));
    if (e) bad.push(`${s}: ${e}`);
  }
  assert.deepEqual(bad, []);
});
