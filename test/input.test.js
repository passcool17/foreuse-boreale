import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as I from '../src/core/input.js';

test('W = propulseur, S = forage bas, distincts', () => {
  assert.equal(I.KEYMAP.KeyW, 'thrust');
  assert.equal(I.KEYMAP.KeyS, 'down');
  assert.equal(I.KEYMAP.ArrowUp, 'thrust');
  assert.equal(I.KEYMAP.Space, 'thrust');
  assert.equal(I.KEYMAP.KeyR, 'survey');
});

test('relâchement par source et releaseAll', () => {
  const i = I.newInput();
  I.press(i, 'left', 'key');
  I.press(i, 'left', 'p1');
  I.release(i, 'left', 'key');
  assert.ok(I.isDown(i, 'left'));
  I.releaseAll(i);
  assert.equal(I.isDown(i, 'left'), false);
});

test('deux actions en parallèle', () => {
  const i = I.newInput();
  I.press(i, 'down', 'key');
  I.press(i, 'thrust', 'p2');
  assert.equal(I.isDown(i, 'down'), true);
  assert.equal(I.isDown(i, 'thrust'), true);
  I.release(i, 'thrust', 'p2');
  assert.equal(I.isDown(i, 'thrust'), false);
  assert.equal(I.isDown(i, 'down'), true);
});
