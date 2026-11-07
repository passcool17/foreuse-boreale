import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CFG } from '../src/core/config.js';
import {
  newRun, arriveAtPad, leavePad, buy, refuel, repair, tow, checkEnd, score, tick, abandon,
  canRescue, rescue,
  seedFromUrl, urlForSeed,
} from '../src/core/run.js';

test('vente unique par arrivée', () => {
  const r = newRun(1);
  r.rig.cargo = [10, 25];
  assert.equal(arriveAtPad(r), 35);
  r.rig.cargo = [10];
  assert.equal(arriveAtPad(r), 0);
  leavePad(r);
  assert.equal(arriveAtPad(r), 10);
  assert.equal(r.credits, 95);
  assert.equal(r.sold, 45);
});

test('Cœur au Poste = victoire, score sans vitesse', () => {
  const r = newRun(1);
  r.rig.heart = true;
  r.rig.cargo = [60];
  arriveAtPad(r);
  assert.equal(r.status, 'won');
  assert.equal(score(r), 60 + 500);
  r.playedS = 9999;
  assert.equal(score(r), 560);
});

test('victoire : pénalité de remorquage, pas le temps', () => {
  const r = newRun(1);
  r.sold = 100;
  r.tows = 2;
  r.rig.heart = true;
  arriveAtPad(r);
  assert.equal(score(r), 100 + 500 - 50);
});

test('amélioration : effet immédiat et jauge remplie', () => {
  const r = newRun(1);
  r.credits = 500;
  r.rig.fuel = 10;
  assert.ok(buy(r, 'reservoir'));
  assert.equal(r.rig.fuelMax, 160);
  assert.equal(r.rig.fuel, 160);
  assert.equal(buy(r, 'reservoir'), false);
  assert.equal(r.credits, 380);
});

test('soute, blindage, mèche et isolation', () => {
  const r = newRun(1);
  r.credits = 2000;
  assert.ok(buy(r, 'soute'));
  assert.equal(r.rig.cargoMax, 18);
  assert.ok(buy(r, 'blindage'));
  assert.equal(r.rig.hullMax, 160);
  assert.equal(r.rig.hull, 160);
  assert.ok(buy(r, 'meche2'));
  assert.ok(r.rig.upgrades.has('meche2'));
  assert.ok(buy(r, 'isolation'));
  assert.equal(buy(r, 'inconnu'), false);
});

test('plein et réparation bornés aux crédits', () => {
  const r = newRun(1);
  r.rig.fuel = 0;
  r.credits = 30;
  assert.equal(refuel(r), 30);
  assert.equal(r.credits, 0);
  assert.equal(r.rig.fuel, 30);
  r.rig.fuel = 97.75;
  r.credits = 60;
  assert.equal(refuel(r), 2);
  assert.equal(r.rig.fuel, 99.75);
  assert.equal(r.credits, 58);
  r.rig.hull = 50;
  r.credits = 20;
  assert.equal(repair(r), 10);
  assert.equal(r.rig.hull, 60);
  assert.equal(r.credits, 0);
});

test('remorquage', () => {
  const r = newRun(1);
  r.rig.cargo = [10];
  r.rig.heart = true;
  tow(r);
  assert.equal(r.credits, 0);
  assert.deepEqual(r.rig.cargo, []);
  assert.equal(r.rig.heart, false);
  assert.equal(r.tows, 1);
  assert.equal(r.status, 'play');
  tow(r);
  assert.equal(r.status, 'lost');
});

test('coque à 0 = défaite, score = minerais vendus', () => {
  const r = newRun(1);
  r.sold = 80;
  r.tows = 1;
  r.rig.hull = 0;
  checkEnd(r);
  assert.equal(r.status, 'lost');
  assert.equal(score(r), 80);
});

test('abandon', () => {
  const r = newRun(1);
  r.sold = 15;
  abandon(r);
  assert.equal(r.status, 'abandoned');
  assert.equal(score(r), 15);
  abandon(r);
  assert.equal(r.status, 'abandoned');
});

test('temps informatif gelé en pause/Atelier', () => {
  const r = newRun(1);
  tick(r, 1);
  r.paused = true;
  tick(r, 1);
  r.paused = false;
  r.workshopOpen = true;
  tick(r, 1);
  assert.equal(r.playedS, 1);
});

test('aucune défaite liée au temps', () => {
  const r = newRun(1);
  tick(r, 1e6);
  checkEnd(r);
  assert.equal(r.status, 'play');
});

test('dépannage unique : du carburant, pas des crédits, pas de score', () => {
  const r = newRun(1);
  r.onPad = true;
  r.rig.fuel = 5;
  r.credits = 10;
  r.sold = 30;
  assert.equal(canRescue(r), true);
  assert.equal(rescue(r), 35);
  assert.equal(r.rig.fuel, 40);
  assert.equal(r.credits, 10);
  assert.equal(r.sold, 30);
  assert.equal(score(r), 30);
  assert.equal(rescue(r), 0);
  assert.equal(r.rig.fuel, 40);
});

test('dépannage refusé sous terre, en entraînement, ou si on peut encore payer', () => {
  const under = newRun(1);
  under.rig.fuel = 0;
  under.credits = 0;
  assert.equal(canRescue(under), false);
  const rich = newRun(1);
  rich.onPad = true;
  rich.rig.fuel = 5;
  rich.credits = 40;
  assert.equal(canRescue(rich), false);
  const lesson = newRun(1, { tutorial: true });
  lesson.onPad = true;
  lesson.rig.fuel = 0;
  lesson.credits = 0;
  assert.equal(canRescue(lesson), false);
});

test('graine dans l’URL', () => {
  assert.equal(seedFromUrl('?seed=42'), 42);
  assert.equal(seedFromUrl('?seed=abc'), null);
  assert.equal(urlForSeed(42), '?seed=42');
});

test('entraînement repérable', () => {
  const r = newRun(5, { tutorial: true });
  assert.equal(r.tutorial, true);
  assert.equal(r.credits, CFG.START_CREDITS);
});
