import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audioPolicy } from '../src/game/audio.js';

test('musique seulement après un geste, silence sans fichier', () => {
  assert.equal(audioPolicy({ musicPref: true, gestured: false, assetLoaded: true }), 'wait');
  assert.equal(audioPolicy({ musicPref: true, gestured: true, assetLoaded: true }), 'play');
  assert.equal(audioPolicy({ musicPref: true, gestured: true, assetLoaded: false }), 'silent');
  assert.equal(audioPolicy({ musicPref: false, gestured: true, assetLoaded: true }), 'silent');
});
