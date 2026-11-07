import { TILE_INFO } from './tiles.js';

export function passable(t, bit2) {
  const info = TILE_INFO[t];
  return !info.solid || (info.drillable && (bit2 || !info.needsBit2));
}

export function reachable(m, from, { bit2 }, blocked = null) {
  const seen = new Uint8Array(m.w * m.h);
  const q = [m.idx(from.x, from.y)];
  seen[q[0]] = 1;
  let qi = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (qi < q.length) {
    const i = q[qi++];
    const x = i % m.w;
    const y = (i / m.w) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const j = m.idx(nx, ny);
      if (seen[j] || (blocked && blocked[j]) || !passable(m.tiles[j], bit2)) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return seen;
}

/**
 * Deux descentes forables (avec Mèche II) vers `targetRow`,
 * disjointes sous la rangée 5. Plafonné à 2.
 */
export function distinctDescents(m, targetRow) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const path = (blocked) => {
    const prev = new Int32Array(m.w * m.h).fill(-2);
    const q = [];
    for (let x = 1; x < m.w - 1; x++) {
      const i = m.idx(x, 0);
      prev[i] = -1;
      q.push(i);
    }
    let qi = 0;
    while (qi < q.length) {
      const i = q[qi++];
      const x = i % m.w;
      const y = (i / m.w) | 0;
      if (y === targetRow) {
        const p = [];
        for (let k = i; k !== -1; k = prev[k]) p.push(k);
        return p;
      }
      for (let d = 0; d < 4; d++) {
        const nx = x + dirs[d][0];
        const ny = y + dirs[d][1];
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const j = m.idx(nx, ny);
        if (prev[j] !== -2 || blocked[j] || !passable(m.tiles[j], true)) continue;
        prev[j] = i;
        q.push(j);
      }
    }
    return null;
  };
  const blocked = new Uint8Array(m.w * m.h);
  const p1 = path(blocked);
  if (!p1) return 0;
  for (const i of p1) if (((i / m.w) | 0) > 5) blocked[i] = 1;
  return path(blocked) ? 2 : 1;
}
