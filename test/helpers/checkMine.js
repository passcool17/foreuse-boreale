import { TILE, TILE_INFO } from '../../src/core/tiles.js';
import { CFG } from '../../src/core/config.js';
import { reachable, distinctDescents } from '../../src/core/topology.js';
import { supported } from '../../src/core/collapse.js';

/** @param {import('../../src/core/mineGen.js').Mine} m @returns {string|null} */
export function checkMine(m) {
  const errs = [];
  if (m.w !== CFG.W || m.h !== CFG.H) errs.push(`taille ${m.w}x${m.h}`);
  for (let y = 0; y < m.h; y++) {
    if (m.get(0, y) !== TILE.ROCMERE) errs.push(`bord gauche ${y}`);
    if (m.get(m.w - 1, y) !== TILE.ROCMERE) errs.push(`bord droit ${y}`);
  }
  if (m.get(0, m.h - 1) !== TILE.ROCMERE) errs.push('fond');
  for (let x = 1; x < m.w - 1; x++) {
    if (m.get(x, 0) !== TILE.VIDE) errs.push(`surface ${x}`);
    if (m.get(x, m.h - 1) !== TILE.ROCMERE) errs.push(`fond ${x}`);
  }
  if (!m.heart || m.heart.y !== CFG.HEART_ROW) errs.push('cœur rangée');
  else if (m.get(m.heart.x, m.heart.y) !== TILE.COEUR) errs.push('tuile cœur');

  const r = reachable(m, { x: m.shaftX, y: 0 }, { bit2: true });
  if (!r[m.idx(m.heart.x, m.heart.y)]) errs.push('Cœur inatteignable');

  let tot = 0;
  let ok = 0;
  for (let i = 0; i < m.tiles.length; i++) {
    const v = TILE_INFO[m.tiles[i]].value;
    tot += v;
    if (r[i]) ok += v;
  }
  if (!(ok >= 0.8 * tot)) errs.push(`valeur ${ok}/${tot}`);

  let cu = 0;
  let ag = 0;
  for (let y = 1; y <= 30; y++) {
    for (let x = 1; x < m.w - 1; x++) {
      const t = m.get(x, y);
      if (t === TILE.CUIVRE) cu++;
      if (t === TILE.ARGENT) ag++;
      if (t === TILE.DURE) errs.push(`roche dure précoce ${x},${y}`);
    }
    if (m.get(m.shaftX, y) === TILE.DURE) errs.push(`puits dur ${y}`);
    if (m.get(m.shaftX, y) === TILE.GAZ) errs.push(`gaz dans le puits ${y}`);
  }
  if (cu < 6 || ag < 2) errs.push(`départ cuivre ${cu} argent ${ag}`);
  if (distinctDescents(m, 100) !== 2) errs.push('descentes');

  for (let y = 1; y <= 10; y++) {
    for (let x = 1; x < m.w - 1; x++) {
      if (m.get(x, y) === TILE.GAZ) errs.push(`gaz trop haut ${x},${y}`);
    }
  }
  for (let y = 1; y < m.h - 1; y++) {
    for (let x = 1; x < m.w - 1; x++) {
      if (m.get(x, y) === TILE.MEUBLE && !supported(m, x, y)) errs.push(`meuble sans soutien ${x},${y}`);
      if (m.get(x, y) === TILE.GAZ && x === m.shaftX) errs.push(`gaz puits ${y}`);
    }
  }
  return errs.length ? errs.slice(0, 8).join('; ') : null;
}
