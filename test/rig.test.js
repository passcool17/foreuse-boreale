import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/core/rig.js';
import { CFG } from '../src/core/config.js';

test('débit unique : propulseur l’emporte', () => {
  const r = R.newRig();
  R.fuelDrain(r, { thrust: true, moving: true }, 1);
  assert.ok(Math.abs(r.fuel - (100 - CFG.FUEL_THRUST)) < 1e-9);
});

test('montée dérivée des constantes : 2,4/s à 4 tuiles/s = 0,6 par tuile', () => {
  assert.equal(CFG.FUEL_THRUST, 2.4);
  assert.equal(CFG.THRUST_SPEED, 4);
  assert.equal(CFG.FUEL_MAX, 100);
  const perTile = CFG.FUEL_THRUST / CFG.THRUST_SPEED;
  assert.equal(perTile, 0.6);
  const r = R.newRig();
  const tiles = 10;
  R.fuelDrain(r, { thrust: true }, tiles / CFG.THRUST_SPEED);
  assert.ok(Math.abs(r.fuel - (100 - tiles * perTile)) < 1e-9);
});

test('forage : pas de débit de roulement', () => {
  const r = R.newRig();
  R.fuelDrain(r, { moving: true, drilling: true }, 1);
  assert.equal(r.fuel, 100);
  R.onTileDrilled(r);
  assert.equal(r.fuel, 100 - CFG.FUEL_PER_TILE);
});

test('immobile = 0', () => {
  const r = R.newRig();
  R.fuelDrain(r, {}, 5);
  assert.equal(r.fuel, 100);
});

test('à vide : 30 % et pas de propulseur', () => {
  const r = R.newRig();
  r.fuel = 0;
  assert.equal(R.speedFactor(r), 0.3);
  assert.equal(R.canThrust(r), false);
});

test('soute pleine refuse, Cœur à part', () => {
  const r = R.newRig();
  for (let i = 0; i < 10; i++) assert.ok(R.pickNugget(r, 10));
  assert.equal(R.pickNugget(r, 10), false);
  R.pickHeart(r);
  assert.equal(r.heart, true);
  assert.equal(r.cargo.length, 10);
});

test('chute', () => {
  assert.equal(R.fallDamage(6), 0);
  assert.equal(R.fallDamage(9), 15);
  assert.equal(R.fallDamage(0), 0);
});

test('carburant borné à 0', () => {
  const r = R.newRig();
  r.fuel = 1;
  R.fuelDrain(r, { thrust: true }, 10);
  assert.equal(r.fuel, 0);
  R.onTileDrilled(r);
  assert.equal(r.fuel, 0);
});

test('impact de bloc au-dessus de 3 tuiles/s', () => {
  assert.equal(R.impactDamage(3), 0);
  assert.equal(R.impactDamage(3.01), 15);
});

test('chenilles seulement si le propulseur ne brûle pas', () => {
  const r = R.newRig();
  R.fuelDrain(r, { moving: true }, 2);
  assert.equal(r.fuel, 98);
});
