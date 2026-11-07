import { CFG } from './config.js';
import { newRig } from './rig.js';
import { UPGRADES } from './economy.js';
import { parseSeed } from './rng.js';

export const newRun = (seed, { tutorial = false } = {}) => ({
  seed,
  tutorial,
  rig: newRig(),
  credits: CFG.START_CREDITS,
  sold: 0,
  tows: 0,
  onPad: false,
  status: 'play',
  playedS: 0,
  paused: false,
  workshopOpen: false,
  rescueUsed: false,
});

/** Une seule vente par arrivée sur la plateforme. Le Cœur vendu = victoire. */
export function arriveAtPad(run) {
  if (run.onPad || run.status !== 'play') return 0;
  run.onPad = true;
  const v = run.rig.cargo.reduce((a, b) => a + b, 0);
  run.rig.cargo = [];
  run.credits += v;
  run.sold += v;
  if (run.rig.heart) run.status = 'won';
  return v;
}

export const leavePad = (run) => { run.onPad = false; };

export function buy(run, id) {
  const u = UPGRADES[id];
  if (!u || run.rig.upgrades.has(id) || run.credits < u.cost) return false;
  run.credits -= u.cost;
  run.rig.upgrades.add(id);
  u.apply(run.rig);
  return true;
}

/** Unités entières qui entrent encore dans le réservoir. On ne facture pas le dépassement. */
export function refuelUnits(run) {
  const room = Math.max(0, run.rig.fuelMax - run.rig.fuel);
  return Math.min(Math.floor(room + 1e-6), Math.floor(run.credits / CFG.FUEL_PRICE));
}

export function refuel(run) {
  const n = refuelUnits(run);
  if (n <= 0) return 0;
  run.rig.fuel += n;
  run.credits -= n * CFG.FUEL_PRICE;
  return n;
}

export function repair(run) {
  const n = Math.min(run.rig.hullMax - run.rig.hull, Math.floor(run.credits / CFG.REPAIR_PRICE));
  if (n <= 0) return 0;
  run.rig.hull += n;
  run.credits -= n * CFG.REPAIR_PRICE;
  return n;
}

/**
 * Remorquage : 50 crédits, soute vidée, Cœur perdu (la scène le remet dans sa tuile).
 * Sans 50 crédits, défaite. La scène replace la foreuse au Poste.
 */
export function tow(run) {
  if (run.status !== 'play') return;
  if (run.credits < CFG.TOW_COST) {
    run.status = 'lost';
    return;
  }
  run.credits -= CFG.TOW_COST;
  run.tows += 1;
  run.rig.cargo = [];
  run.rig.heart = false;
  run.onPad = false;
}

/** Dépannage unique au Poste. Ne crée pas de crédits et n'entre pas dans le score. */
export function canRescue(run) {
  return run.status === 'play'
    && !run.tutorial
    && !run.rescueUsed
    && run.onPad
    && run.rig.fuel < 20
    && run.credits < 40;
}

export function rescue(run) {
  if (!canRescue(run)) return 0;
  run.rescueUsed = true;
  const grant = Math.max(0, 40 - run.rig.fuel);
  run.rig.fuel += grant;
  return grant;
}

export function checkEnd(run) {
  if (run.status === 'play' && run.rig.hull <= 0) run.status = 'lost';
}

export const abandon = (run) => {
  if (run.status === 'play') run.status = 'abandoned';
};

/**
 * Victoire : minerais vendus + 500 − 25 par remorquage.
 * Défaite et abandon : minerais vendus seulement (spec §9).
 * Le temps n'entre jamais dans le score.
 */
export function score(run) {
  if (run.status === 'won') return run.sold + CFG.HEART_POINTS - CFG.TOW_PENALTY * run.tows;
  return run.sold;
}

export function tick(run, dt) {
  if (!run.paused && !run.workshopOpen && run.status === 'play') run.playedS += dt;
}

export const seedFromUrl = (search) => parseSeed(new URLSearchParams(search).get('seed'));

export const urlForSeed = (seed) => `?seed=${seed >>> 0}`;
