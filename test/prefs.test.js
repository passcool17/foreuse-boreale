import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Pr from '../src/core/prefs.js';

const mem = () => {
  const s = {};
  return {
    getItem: (k) => s[k] ?? null,
    setItem: (k, v) => { s[k] = String(v); },
  };
};

test('préférences par défaut, musique activée', () => {
  assert.deepEqual(Pr.loadPrefs(mem()), { music: true, volume: 0.6, tutorialDone: false, best: 0 });
});

test('entraînement sans record', () => {
  const p = Pr.loadPrefs(mem());
  assert.equal(Pr.recordScore(p, { tutorial: true }, 999), false);
  assert.equal(p.best, 0);
  assert.ok(Pr.recordScore(p, { tutorial: false }, 10));
  assert.equal(p.best, 10);
  assert.equal(Pr.recordScore(p, { tutorial: false }, 10), false);
  assert.equal(Pr.recordScore(p, { tutorial: false }, 9), false);
});

test('stockage illisible → défauts', () => {
  assert.equal(Pr.loadPrefs({ getItem: () => '{bad', setItem() {} }).music, true);
});

test('aucune clé de partie', () => {
  const s = mem();
  Pr.savePrefs(s, Pr.loadPrefs(s));
  assert.equal(s.getItem('fb.run'), null);
  assert.ok(s.getItem('fb.prefs').includes('"music":true'));
});

test('volume borné et types incohérents ignorés', () => {
  const s = mem();
  s.setItem('fb.prefs', JSON.stringify({ music: 'oui', volume: 4, tutorialDone: 1, best: -3, fuel: 1 }));
  const p = Pr.loadPrefs(s);
  assert.equal(p.music, true);
  assert.equal(p.volume, 1);
  assert.equal(p.tutorialDone, false);
  assert.equal(p.best, 0);
  assert.equal('fuel' in p, false);
});
