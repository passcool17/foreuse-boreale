import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, parseSeed, randomSeed } from '../src/core/rng.js';

test('même graine, même suite', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('valeurs dans [0,1[', () => {
  const r = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
});

test('parseSeed', () => {
  assert.equal(parseSeed('123'), 123);
  assert.equal(parseSeed('abc'), null);
  assert.equal(parseSeed(null), null);
  assert.equal(parseSeed(''), null);
  assert.equal(parseSeed('1.5'), null);
  assert.equal(parseSeed('0'), 0);
});

test('randomSeed est un uint32', () => {
  const s = randomSeed();
  assert.equal(s, s >>> 0);
});
