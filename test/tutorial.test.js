import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_STEPS, advanceTutorial, TUTORIAL_SEED } from '../src/game/tutorial.js';

test('étapes dans l’ordre, chacune validée par une action', () => {
  let s = { i: 0 };
  assert.deepEqual(TUTORIAL_STEPS.map((t) => t.id), [
    'rouler', 'forerBas', 'ramasser', 'propulseur', 'eviterBloc', 'reculerGaz', 'vendre',
  ]);
  s = advanceTutorial(s, { type: 'forer' });
  assert.equal(s.i, 0);
  s = advanceTutorial(s, { type: 'rouler' });
  assert.equal(s.i, 1);
  s = advanceTutorial(s, { type: 'forer', dir: 'down' });
  assert.equal(s.i, 2);
  s = advanceTutorial(s, { type: 'ramasser' });
  assert.equal(s.i, 3);
  s = advanceTutorial(s, { type: 'propulseur' });
  assert.equal(s.i, 4);
  s = advanceTutorial(s, { type: 'blocEvite' });
  assert.equal(s.i, 5);
  s = advanceTutorial(s, { type: 'gazEvite' });
  assert.equal(s.i, 6);
  s = advanceTutorial(s, { type: 'vente' });
  assert.equal(s.i, 7);
  assert.equal(s.i, TUTORIAL_STEPS.length);
});

test('graine d’entraînement fixe', () => {
  assert.equal(TUTORIAL_SEED, 20261106);
});
