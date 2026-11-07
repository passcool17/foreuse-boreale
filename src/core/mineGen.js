import { mulberry32 } from './rng.js';
import { TILE, stratumTile } from './tiles.js';
import { CFG } from './config.js';
import { reachable, distinctDescents } from './topology.js';
import { supported } from './collapse.js';
import { TILE_INFO } from './tiles.js';

const ORES = [
  [TILE.CUIVRE, 0, 1, 0.03],
  [TILE.ARGENT, 1, 2, 0.02],
  [TILE.OR, 2, 3, 0.015],
  [TILE.CRISTAL, 3, 3, 0.008],
];

export function makeMine(seed, w = CFG.W, h = CFG.H) {
  const tiles = new Uint8Array(w * h);
  const idx = (x, y) => y * w + x;
  return {
    seed,
    w,
    h,
    tiles,
    idx,
    get: (x, y) => tiles[idx(x, y)],
    set: (x, y, t) => { tiles[idx(x, y)] = t; },
    heart: null,
    shaftX: w >> 1,
  };
}

function valueShare(m, reach) {
  let t = 0;
  let o = 0;
  for (let i = 0; i < m.tiles.length; i++) {
    const v = TILE_INFO[m.tiles[i]].value;
    t += v;
    if (reach[i]) o += v;
  }
  return t ? o / t : 1;
}

function clearHardOnPath(m) {
  const prev = new Int32Array(m.w * m.h).fill(-2);
  const q = [m.idx(m.shaftX, 0)];
  prev[q[0]] = -1;
  let qi = 0;
  let found = -1;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (qi < q.length) {
    const i = q[qi++];
    const x = i % m.w;
    const y = (i / m.w) | 0;
    if (x === m.heart.x && y === m.heart.y) { found = i; break; }
    for (let d = 0; d < 4; d++) {
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const j = m.idx(nx, ny);
      if (prev[j] !== -2) continue;
      const tile = m.tiles[j];
      if (tile === TILE.ROCMERE) continue;
      prev[j] = i;
      q.push(j);
    }
  }
  if (found < 0) return;
  for (let k = found; k !== -1; k = prev[k]) {
    const x = k % m.w;
    const y = (k / m.w) | 0;
    if (m.get(x, y) === TILE.DURE) m.set(x, y, stratumTile(y));
  }
}

function repairTopology(m) {
  for (let y = 1; y <= 30; y++) {
    const t = m.get(m.shaftX, y);
    if (t === TILE.DURE || t === TILE.GAZ) m.set(m.shaftX, y, stratumTile(y));
  }
  for (let pass = 0; pass < 8; pass++) {
    const reach = reachable(m, { x: m.shaftX, y: 0 }, { bit2: true });
    const ok = reach[m.idx(m.heart.x, m.heart.y)]
      && distinctDescents(m, 100) === 2
      && valueShare(m, reach) >= 0.8;
    if (ok) return;
    clearHardOnPath(m);
    const x2 = m.shaftX > m.w / 2 ? 3 : m.w - 4;
    for (let y = 1; y < m.h - 1; y++) {
      if (m.get(x2, y) === TILE.DURE) m.set(x2, y, stratumTile(y));
    }
  }
  throw new Error(`graine ${m.seed} : topologie irréparable`);
}

function ensureStartOres(m, r) {
  const count = (t) => {
    let n = 0;
    for (let y = 1; y <= 30; y++) {
      for (let x = 1; x < m.w - 1; x++) if (m.get(x, y) === t) n++;
    }
    return n;
  };
  for (const [t, need] of [[TILE.CUIVRE, 6], [TILE.ARGENT, 2]]) {
    let n = count(t);
    let guard = 0;
    while (n < need && guard < 8000) {
      guard += 1;
      const x = 1 + Math.floor(r() * (m.w - 2));
      const y = 2 + Math.floor(r() * 29);
      if (x === m.shaftX) continue;
      const cur = m.get(x, y);
      if (cur === t || cur === TILE.COEUR || cur === TILE.ROCMERE) continue;
      m.set(x, y, t);
      n += 1;
    }
    if (n < need) throw new Error(`minerais de départ, graine ${m.seed}`);
  }
}

function stabilizeLoose(m) {
  let changed = true;
  let guard = 0;
  while (changed && guard < 8) {
    changed = false;
    guard += 1;
    for (let y = 1; y < m.h - 1; y++) {
      for (let x = 1; x < m.w - 1; x++) {
        if (m.get(x, y) === TILE.MEUBLE && !supported(m, x, y)) {
          m.set(x, y, stratumTile(y));
          changed = true;
        }
      }
    }
  }
}

export function generateMine(seed) {
  const r = mulberry32(seed >>> 0);
  const m = makeMine(seed >>> 0);
  const { w, h } = m;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === h - 1) {
        m.set(x, y, TILE.ROCMERE);
        continue;
      }
      if (y === 0) {
        m.set(x, y, TILE.VIDE);
        continue;
      }
      const s = Math.min(3, Math.floor((y - 1) / CFG.STRATUM_ROWS));
      let t = stratumTile(y);
      const u = r();
      let acc = 0;
      for (const [ore, a, b, p] of ORES) {
        if (s >= a && s <= b) {
          acc += p;
          if (u < acc) { t = ore; break; }
        }
      }
      if (t === stratumTile(y)) {
        const roll = r();
        if (y > 30 && roll < 0.06) t = TILE.DURE;
        else if (y > 10 && x !== m.shaftX && roll >= 0.06 && roll < 0.11) t = TILE.GAZ;
        else if (roll >= 0.11 && roll < 0.11 + CFG.LOOSE_RATIO) t = TILE.MEUBLE;
      }
      m.set(x, y, t);
    }
  }
  const hx = 1 + Math.floor(r() * (w - 2));
  m.heart = { x: hx, y: CFG.HEART_ROW };
  m.set(hx, CFG.HEART_ROW, TILE.COEUR);
  repairTopology(m);
  ensureStartOres(m, r);
  stabilizeLoose(m);
  if (m.get(m.heart.x, m.heart.y) !== TILE.COEUR) m.set(m.heart.x, m.heart.y, TILE.COEUR);
  return m;
}
