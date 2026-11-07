/**
 * Marge du PREMIER voyage seulement, coûts mesurés dans le moteur :
 * Montée = CFG.FUEL_THRUST / CFG.THRUST_SPEED. Chute d'une tuile en creusant = 0 dégât.
 * Aucune redescente d'un puits déjà ouvert. Aucun carburant gratuit.
 */
import { generateMine } from '../src/core/mineGen.js';
import { TILE, TILE_INFO } from '../src/core/tiles.js';
import { CFG } from '../src/core/config.js';

const DRILL = CFG.FUEL_PER_TILE;
const UP = CFG.FUEL_THRUST / CFG.THRUST_SPEED;
const HORIZ = CFG.FUEL_TRACK / CFG.TRACK_SPEED;

function cost(tile, ax, ay, bx, by) {
  if (by < ay && TILE_INFO[tile].solid) return null;
  if (tile === TILE.ROCMERE) return null;
  if (tile === TILE.DURE) return null;
  let c = 0;
  if (tile !== TILE.VIDE && TILE_INFO[tile].solid) c += DRILL;
  if (ax !== bx && tile === TILE.VIDE) c += HORIZ;
  else if (by < ay && tile === TILE.VIDE) c += UP;
  else if (by > ay && tile === TILE.VIDE) c += 0;
  return c;
}

function search(mine, x, y) {
  const w = mine.w;
  const dist = new Float64Array(w * mine.h);
  dist.fill(Infinity);
  const prev = new Int32Array(w * mine.h);
  prev.fill(-1);
  const start = y * w + x;
  dist[start] = 0;
  const h = [{ i: start, d: 0 }];
  const push = (item) => {
    h.push(item);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (h[p].d <= h[i].d) break;
      [h[p], h[i]] = [h[i], h[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = h[0];
    const last = h.pop();
    if (!h.length) return top;
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let s = i;
      if (l < h.length && h[l].d < h[s].d) s = l;
      if (r < h.length && h[r].d < h[s].d) s = r;
      if (s === i) break;
      [h[s], h[i]] = [h[i], h[s]];
      i = s;
    }
    return top;
  };
  while (h.length) {
    const cur = pop();
    if (cur.d !== dist[cur.i]) continue;
    const cx = cur.i % w;
    const cy = (cur.i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx <= 0 || ny < 0 || nx >= w - 1 || ny >= mine.h - 1) continue;
      const step = cost(mine.get(nx, ny), cx, cy, nx, ny);
      if (step == null) continue;
      const j = ny * w + nx;
      const nd = cur.d + step;
      if (nd >= dist[j]) continue;
      dist[j] = nd;
      prev[j] = cur.i;
      push({ i: j, d: nd });
    }
  }
  return { dist, prev, w };
}

function firstTrip(seed) {
  const mine = generateMine(seed);
  const home = mine.idx(mine.shaftX, 0);
  const map = search(mine, mine.shaftX, 0);
  let best = null;
  for (let y = 1; y < 45; y++) {
    for (let x = 1; x < mine.w - 1; x++) {
      const value = TILE_INFO[mine.get(x, y)].value;
      if (!value) continue;
      const j = mine.idx(x, y);
      if (!Number.isFinite(map.dist[j])) continue;
      const climb = UP * y + HORIZ * Math.abs(x - mine.shaftX);
      const need = map.dist[j] + climb;
      if (need > CFG.FUEL_MAX - 2) continue;
      const score = value / need;
      if (!best || score > best.score) best = { x, y, value, need, score };
    }
  }
  let early = 0;
  let n = 0;
  for (let y = 1; y <= 30; y++) {
    for (let x = 1; x < mine.w - 1; x++) {
      const v = TILE_INFO[mine.get(x, y)].value;
      if (v) { early += v; n++; }
    }
  }
  const reachableValue = best ? best.value : 0;
  const fuel = best ? best.need : 0;
  const net = 50 + reachableValue - Math.ceil(fuel);
  return { seed, early, n, best, netIfOnlyThatOre: net };
}

const rows = [];
for (let s = 1001; s <= 1020; s++) rows.push(firstTrip(s));
const avgEarly = rows.reduce((a, r) => a + r.early, 0) / rows.length;
console.log('valeur moyenne rangées 1-30', avgEarly.toFixed(0));
for (const r of rows) {
  const b = r.best;
  console.log(`${r.seed} stock30=${r.early} (${r.n}) meilleur=${b ? `${b.value}@${b.x},${b.y} carburant=${b.need.toFixed(1)}` : 'aucun'} net_un_seul=${r.netIfOnlyThatOre}`);
}
