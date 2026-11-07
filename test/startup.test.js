import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const portable = fs.readFileSync(new URL('../Foreuse-Boreale.html', import.meta.url), 'utf8');

test('la page source affiche l’échec si les modules sont bloqués', () => {
  assert.match(index, /if \(window\.__FB_BOOT\) return/);
  assert.match(index, /archive ZIP/);
  assert.equal((index.match(/<script>/g) || []).length >= 1, true);
  assert.match(index, /type="module"/);
});

test('le fichier double-clic n’utilise pas de module', () => {
  assert.equal(portable.includes('type="module"'), false);
  assert.equal(portable.includes('type=\'module\''), false);
  assert.match(portable, /__FB_BOOT/);
  assert.match(portable, /Phaser/);
  assert.match(portable, /Jouer/);
  assert.ok(portable.length > 500_000);
});
