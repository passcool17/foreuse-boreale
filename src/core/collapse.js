import { CFG } from './config.js';
import { TILE, TILE_INFO, stratumTile } from './tiles.js';

const solid = (m, x, y) => (
  x < 0 || y < 0 || x >= m.w || y >= m.h || TILE_INFO[m.get(x, y)].solid
);

export const newCollapse = () => ({ warnings: [], queue: [], blocks: [], nextId: 1 });

/** Soutien : sol sous la tuile, ou solide des deux côtés. */
export const supported = (m, x, y) => solid(m, x, y + 1) || (solid(m, x - 1, y) && solid(m, x + 1, y));

export function afterDrill(c, m, x0, y0) {
  const R = CFG.COLLAPSE_RADIUS;
  for (let y = y0 - R; y <= y0 + R; y++) {
    for (let x = x0 - R; x <= x0 + R; x++) {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      if (m.get(x, y) !== TILE.MEUBLE) continue;
      if (supported(m, x, y)) continue;
      if (c.warnings.some((w) => w.x === x && w.y === y)) continue;
      if (c.queue.some((q) => q.x === x && q.y === y)) continue;
      c.warnings.push({ x, y, t: 0 });
    }
  }
}

/**
 * Avance les annonces de 2 s. Une roche qui retrouve un soutien est retirée.
 * Au-delà de 12 blocs, le reste attend en file (toujours visible comme annonce).
 */
export function advanceWarnings(c, m, dt) {
  const out = [];
  const keep = [];
  for (const w of c.warnings) {
    w.t += dt;
    if (m.get(w.x, w.y) !== TILE.MEUBLE || supported(m, w.x, w.y)) continue;
    if (w.t >= CFG.WARN_S) c.queue.push({ x: w.x, y: w.y });
    else keep.push(w);
  }
  c.warnings = keep;
  while (c.queue.length && c.blocks.length < CFG.MAX_BLOCKS) {
    const { x, y } = c.queue.shift();
    if (m.get(x, y) !== TILE.MEUBLE || supported(m, x, y)) continue;
    m.set(x, y, TILE.VIDE);
    c.blocks.push({ id: c.nextId++, x, y, state: 'falling', restS: 0, ageS: 0 });
    out.push({ x, y });
  }
  return out;
}

function rigHasExit(m, rig, cell) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const x = rig.x + dx;
    const y = rig.y + dy;
    return !(x === cell.x && y === cell.y) && !solid(m, x, y);
  });
}

/**
 * Re-fige le bloc dans sa case, ou le laisse endormi (obstacle statique forable).
 * Jamais sur la foreuse, le Cœur, une pépite, une case déjà solide, ni si ça enferme.
 */
export function trySettle(c, m, block, cell, occupied, rigCell) {
  const bad = (cell.x === rigCell.x && cell.y === rigCell.y)
    || (m.heart && cell.x === m.heart.x && cell.y === m.heart.y)
    || occupied(cell.x, cell.y)
    || solid(m, cell.x, cell.y)
    || !rigHasExit(m, rigCell, cell);
  if (bad) {
    block.state = 'sleeping';
    return 'sleeping';
  }
  m.set(cell.x, cell.y, stratumTile(cell.y));
  c.blocks = c.blocks.filter((b) => b !== block);
  return 'tile';
}

export function removeBlock(c, id) {
  c.blocks = c.blocks.filter((b) => b.id !== id);
}
