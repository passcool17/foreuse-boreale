import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStepper } from '../src/game/loop.js';

test('pas fixe 60 Hz et plafond de 4 sous-pas', () => {
  let n = 0;
  const s = makeStepper(() => n++);
  assert.equal(s(1 / 60), 1);
  assert.equal(s(1), 4);
  assert.equal(n, 5);
  s.reset();
  assert.equal(s(0.5 / 60), 0);
  assert.equal(n, 5);
});
