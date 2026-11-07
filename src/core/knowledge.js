import { CFG } from './config.js';

export const newKnowledge = (m) => new Uint8Array(m.w * m.h);

export function reveal(k, m, cx, cy, r = CFG.REVEAL_RADIUS) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      if (Math.abs(x - cx) + Math.abs(y - cy) <= r) k[m.idx(x, y)] = 1;
    }
  }
}

export function survey(k, m, rig, cx, cy, still) {
  if (!still || rig.fuel < CFG.SURVEY_FUEL) return false;
  rig.fuel -= CFG.SURVEY_FUEL;
  const last = Math.min(m.h - 1, cy + CFG.SURVEY_DEPTH);
  for (let y = cy + 1; y <= last; y++) k[m.idx(cx, y)] = 1;
  return true;
}

/** Estimation prudente, pas une garantie. 3 × profondeur × 1,25, arrondie au supérieur. */
export const returnReserve = (depthRows) => Math.ceil(3 * depthRows * CFG.RESERVE_FACTOR);
