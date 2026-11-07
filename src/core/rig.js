import { CFG } from './config.js';

export const newRig = () => ({
  fuel: CFG.FUEL_MAX,
  fuelMax: CFG.FUEL_MAX,
  hull: CFG.HULL_MAX,
  hullMax: CFG.HULL_MAX,
  cargo: [],
  cargoMax: CFG.CARGO_MAX,
  heart: false,
  upgrades: new Set(),
});

/** Un seul débit continu, le plus élevé. Le forage n'a pas de débit de roulement. */
export function fuelDrain(rig, { thrust = false, moving = false, drilling = false } = {}, dt) {
  const rate = thrust && rig.fuel > 0
    ? CFG.FUEL_THRUST
    : (moving && !drilling ? CFG.FUEL_TRACK : 0);
  rig.fuel = Math.max(0, rig.fuel - rate * dt);
}

export const onTileDrilled = (rig) => {
  rig.fuel = Math.max(0, rig.fuel - CFG.FUEL_PER_TILE);
};

export const speedFactor = (rig) => (rig.fuel > 0 ? 1 : CFG.FUEL_EMPTY_SPEED_FACTOR);

export const canThrust = (rig) => rig.fuel > 0;

export function pickNugget(rig, value) {
  if (rig.cargo.length >= rig.cargoMax) return false;
  rig.cargo.push(value);
  return true;
}

export const pickHeart = (rig) => { rig.heart = true; };

export const fallDamage = (tiles) => Math.max(0, CFG.FALL_DMG_PER_TILE * (tiles - CFG.FALL_FREE_TILES));

export const impactDamage = (tilesPerSec) => (
  tilesPerSec > CFG.BLOCK_DMG_SPEED ? CFG.BLOCK_DMG : 0
);

export const damage = (rig, n) => { rig.hull = Math.max(0, rig.hull - n); };
