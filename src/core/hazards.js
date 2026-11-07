import { CFG } from './config.js';
import { TILE } from './tiles.js';

export const newHazards = () => ({ gas: [], heatAcc: 0, inHeat: false });

export function armGasCell(h, x, y) {
  if (!h.gas.some((g) => g.x === x && g.y === y)) h.gas.push({ x, y, t: 0 });
}

export function armGasNear(h, m, x, y) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const gx = x + dx;
    const gy = y + dy;
    if (gx < 0 || gy < 0 || gx >= m.w || gy >= m.h) continue;
    if (m.get(gx, gy) === TILE.GAZ) armGasCell(h, gx, gy);
  }
}

export function advanceGas(h, m, dt) {
  const out = [];
  const keep = [];
  for (const g of h.gas) {
    g.t += dt;
    if (g.t < CFG.WARN_S) {
      keep.push(g);
      continue;
    }
    if (m.get(g.x, g.y) === TILE.GAZ) {
      m.set(g.x, g.y, TILE.VIDE);
      out.push({ x: g.x, y: g.y });
    }
  }
  h.gas = keep;
  return out;
}

export function heatTick(h, rig, row, dt) {
  const hot = row > CFG.HEAT_ROW;
  const entered = hot && !h.inHeat;
  h.inHeat = hot;
  if (!hot || rig.upgrades.has('isolation')) {
    h.heatAcc = 0;
    return { entered, dmg: 0 };
  }
  h.heatAcc += dt;
  let dmg = 0;
  while (h.heatAcc >= CFG.HEAT_PERIOD_S) {
    h.heatAcc -= CFG.HEAT_PERIOD_S;
    dmg += CFG.HEAT_DMG;
  }
  return { entered, dmg };
}

/** Rayon 1 en cases : la case et ses 8 voisines. */
export const inBlast = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by)) <= 1;
