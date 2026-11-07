import { CFG } from './config.js';

export const UPGRADES = Object.freeze({
  reservoir: { cost: 120, apply: (r) => { r.fuelMax = 160; r.fuel = 160; } },
  soute: { cost: 150, apply: (r) => { r.cargoMax = 18; } },
  meche2: { cost: 250, apply: () => {} },
  blindage: { cost: 200, apply: (r) => { r.hullMax = 160; r.hull = 160; } },
  isolation: { cost: 300, apply: () => {} },
});

export const UPGRADE_ORDER = Object.freeze(['reservoir', 'soute', 'meche2', 'blindage', 'isolation']);

export const drillTime = (baseS, rig) => (
  rig.upgrades.has('meche2') ? baseS * (1 - CFG.BIT2_SPEEDUP) : baseS
);

export const canDrillTile = (info, rig) => (
  info.drillable && (!info.needsBit2 || rig.upgrades.has('meche2'))
);
