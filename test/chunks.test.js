import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRow } from '../src/game/chunks.js';

test('fusion des suites solides', () => {
  assert.deepEqual(mergeRow([1, 1, 1, 0, 1]), [{ x: 0, w: 3 }, { x: 4, w: 1 }]);
  assert.deepEqual(mergeRow([0, 0, 0]), []);
  assert.deepEqual(mergeRow([1, 1]), [{ x: 0, w: 2 }]);
});
