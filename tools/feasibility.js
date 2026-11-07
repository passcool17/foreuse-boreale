/**
 * Bot de validation. Coûts du moteur, aucun plein gratuit, aucune téléportation.
 * Montée : CFG.FUEL_THRUST / CFG.THRUST_SPEED (2,4/s à 4 tuiles/s = 0,6).
 * Un voyage peut creuser un puits qui ne se paie pas tout de suite : le retour
 * du Cœur est le gain, tant que le réservoir et la caisse couvrent le trajet
 * réel (pas une estimation au seul dénivelé).
 * Chute > 6 tuiles refusée. Pas de forage vers le haut. Gaz contourné.
 * Chaleur : heatTick réel ; Isolation achetée avant un long séjour si la caisse le permet.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { generateMine, makeMine } from '../src/core/mineGen.js';
import { TILE, TILE_INFO } from '../src/core/tiles.js';
import { CFG } from '../src/core/config.js';
import { newRun, arriveAtPad, leavePad, buy, refuel, repair } from '../src/core/run.js';
import { onTileDrilled, pickNugget, pickHeart, damage } from '../src/core/rig.js';
import { UPGRADES } from '../src/core/economy.js';
import { heatTick, newHazards } from '../src/core/hazards.js';

const UP = CFG.FUEL_THRUST / CFG.THRUST_SPEED;
const HORIZ = CFG.FUEL_TRACK / CFG.TRACK_SPEED;

function heapPush(h, item) {
  h.push(item);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p].d <= h[i].d) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}

function heapPop(h) {
  const top = h[0];
  const last = h.pop();
  if (!h.length || last == null) return top;
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
}

function airAbove(mine, x, y) {
  let n = 0;
  for (let yy = y - 1; yy >= 0; yy--) {
    if (TILE_INFO[mine.get(x, yy)].solid) break;
    n += 1;
  }
  return n;
}

function fallTiles(mine, x, y) {
  let n = 1;
  let yy = y;
  while (yy + 1 < mine.h - 1 && !TILE_INFO[mine.get(x, yy + 1)].solid) {
    n += 1;
    yy += 1;
    if (n > CFG.FALL_FREE_TILES) return n;
  }
  return n;
}

export function stepCost(mine, rig, ax, ay, bx, by) {
  if (bx <= 0 || by < 0 || bx >= mine.w - 1 || by >= mine.h - 1) return null;
  const tile = mine.get(bx, by);
  const info = TILE_INFO[tile];
  if (tile === TILE.GAZ || tile === TILE.ROCMERE) return null;
  if (tile === TILE.DURE && !rig.upgrades.has('meche2')) return null;
  if (by < ay && info.solid) return null;
  if (by > ay && info.solid) {
    let drop = 1;
    let yy = by;
    while (yy + 1 < mine.h - 1 && !TILE_INFO[mine.get(bx, yy + 1)].solid) {
      drop += 1;
      yy += 1;
      if (drop > CFG.FALL_FREE_TILES) return null;
    }
  } else if (by > ay && fallTiles(mine, bx, by) > CFG.FALL_FREE_TILES) return null;
  if (info.solid) return CFG.FUEL_PER_TILE;
  if (bx !== ax) return HORIZ;
  if (by < ay) return UP;
  return 0;
}

function searchFrom(mine, rig, x, y) {
  const w = mine.w;
  const dist = new Float64Array(w * mine.h);
  dist.fill(Infinity);
  const prev = new Int32Array(w * mine.h);
  prev.fill(-1);
  const start = y * w + x;
  dist[start] = 0;
  const heap = [{ i: start, d: 0 }];
  while (heap.length) {
    const cur = heapPop(heap);
    if (cur.d !== dist[cur.i]) continue;
    const cx = cur.i % w;
    const cy = (cur.i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const step = stepCost(mine, rig, cx, cy, nx, ny);
      if (step == null) continue;
      const j = ny * w + nx;
      const nd = cur.d + step;
      if (nd >= dist[j]) continue;
      dist[j] = nd;
      prev[j] = cur.i;
      heapPush(heap, { i: j, d: nd });
    }
  }
  return { dist, prev, w };
}

/** Coût réel pour revenir au puits, sur le graphe inversé. */
function returnCosts(mine, rig) {
  const w = mine.w;
  const dist = new Float64Array(w * mine.h);
  dist.fill(Infinity);
  const prev = new Int32Array(w * mine.h);
  prev.fill(-1);
  const start = mine.shaftX;
  dist[start] = 0;
  const heap = [{ i: start, d: 0 }];
  while (heap.length) {
    const cur = heapPop(heap);
    if (cur.d !== dist[cur.i]) continue;
    const cx = cur.i % w;
    const cy = (cur.i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const step = stepCost(mine, rig, nx, ny, cx, cy);
      if (step == null) continue;
      const j = ny * w + nx;
      const nd = cur.d + step;
      if (nd >= dist[j]) continue;
      dist[j] = nd;
      prev[j] = cur.i;
      heapPush(heap, { i: j, d: nd });
    }
  }
  return { dist, prev, w };
}

function rebuild(prev, w, from, to) {
  if (from === to) return [];
  if (prev[to] < 0) return null;
  const cells = [];
  for (let k = to; k !== from; k = prev[k]) {
    if (k < 0 || cells.length > 20000) return null;
    cells.push(k);
  }
  cells.reverse();
  return cells;
}

/** Escalier : au plus 6 vides d'affilée dans une colonne, pour pouvoir redescendre. */
export function stairPlan(mine) {
  const cols = [mine.shaftX];
  const alt = mine.shaftX + 1 < mine.w - 1 ? mine.shaftX + 1 : mine.shaftX - 1;
  cols.push(alt);
  const cells = [];
  let band = 0;
  const goalY = mine.heart.y;
  for (let y = 1; y <= goalY; y++) {
    cells.push([cols[band % 2], y]);
    if (y % 6 === 0 && y < goalY) {
      band += 1;
      cells.push([cols[band % 2], y]);
    }
  }
  let x = cells[cells.length - 1][0];
  const dir = Math.sign(mine.heart.x - x);
  while (dir && x !== mine.heart.x) {
    x += dir;
    cells.push([x, goalY]);
  }
  return cells;
}

function travelSeconds(tile, ax, ay, bx, by, rig) {
  const info = TILE_INFO[tile];
  if (info.solid) {
    const base = Number.isFinite(info.hardness) ? info.hardness : 1;
    return rig.upgrades.has('meche2') ? base * (1 - CFG.BIT2_SPEEDUP) : base;
  }
  if (bx !== ax) return 1 / CFG.TRACK_SPEED;
  if (by < ay) return 1 / CFG.THRUST_SPEED;
  return 0.35;
}

function edgeBack(x, y, nx, ny) {
  if (nx !== x) return HORIZ;
  if (ny > y) return UP;
  return 0;
}

export function emptyMine(w, h, shaftX, heart) {
  const mine = makeMine(1, w, h);
  mine.shaftX = shaftX;
  mine.heart = heart;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === h - 1) mine.set(x, y, TILE.ROCMERE);
      else if (y === 0) mine.set(x, y, TILE.VIDE);
      else mine.set(x, y, TILE.TOURBE);
    }
  }
  mine.set(heart.x, heart.y, TILE.COEUR);
  return mine;
}

/**
 * @param {object} mine
 * @param {{ seed?: number, stepCap?: number }} [opts]
 */
export function simulateMine(mine, opts = {}) {
  const seed = opts.seed ?? mine.seed ?? 0;
  const stepCap = opts.stepCap ?? (Number(process.env.FB_STEPS) || 8000);
  const loopCap = Number(process.env.FB_LOOPS) || Math.max(16000, stepCap * 3);
  const run = newRun(seed);
  const hazards = newHazards();
  const log = [];
  const stair = stairPlan(mine);
  let x = mine.shaftX;
  let y = 0;
  let steps = 0;
  let fuelSpent = 0;
  let maxY = 0;
  let raison = 'boucle';
  let oreSteps = 0;
  const spend = (n) => { fuelSpent += n; };
  const atPad = () => y === 0 && Math.abs(x - mine.shaftX) <= 2;

  function payMove(nx, ny) {
    const tile = mine.get(nx, ny);
    const info = TILE_INFO[tile];
    const before = run.rig.fuel;
    if (info.solid) {
      onTileDrilled(run.rig);
      if (info.value > 0 && run.rig.cargo.length < run.rig.cargoMax) pickNugget(run.rig, info.value);
      if (tile === TILE.COEUR) pickHeart(run.rig);
      mine.set(nx, ny, TILE.VIDE);
    } else if (nx !== x) run.rig.fuel = Math.max(0, run.rig.fuel - HORIZ);
    else if (ny < y) run.rig.fuel = Math.max(0, run.rig.fuel - UP);
    const used = before - run.rig.fuel;
    if (used > 0) spend(used);
    const secs = travelSeconds(tile, x, y, nx, ny, run.rig);
    const heat = heatTick(hazards, run.rig, Math.max(y, ny), secs);
    if (heat.dmg) damage(run.rig, heat.dmg);
    x = nx;
    y = ny;
    if (y > maxY) maxY = y;
    steps += 1;
  }

  function reachable(rig = run.rig) {
    const map = searchFrom(mine, rig, mine.shaftX, 0);
    const j = mine.idx(mine.heart.x, mine.heart.y);
    return Number.isFinite(map.dist[j]);
  }

  function services() {
    if (!atPad()) {
      if (run.onPad) leavePad(run);
      return;
    }
    if (!run.onPad) {
      const sold = arriveAtPad(run);
      if (sold > 0) log.push({ t: 'vente', montant: sold, credits: run.credits, fuel: +run.rig.fuel.toFixed(1) });
    }
    if (run.status !== 'play') return;
    oreSteps = 0;
    const repaired = repair(run);
    if (repaired > 0) log.push({ t: 'reparer', points: repaired, credits: run.credits, coque: run.rig.hull });
    const climb = UP * mine.heart.y;
    if (!run.rig.upgrades.has('reservoir') && climb > run.rig.fuelMax - 15 && run.credits >= UPGRADES.reservoir.cost) {
      const before = run.credits;
      if (buy(run, 'reservoir')) log.push({ t: 'achat', id: 'reservoir', prix: before - run.credits, credits: run.credits, fuel: run.rig.fuel });
    }
    if (!run.rig.upgrades.has('isolation') && mine.heart.y > CFG.HEAT_ROW
      && run.credits >= UPGRADES.isolation.cost + 20) {
      const before = run.credits;
      if (buy(run, 'isolation')) log.push({ t: 'achat', id: 'isolation', prix: before - run.credits, credits: run.credits, fuel: run.rig.fuel });
    }
    if (!run.rig.upgrades.has('meche2') && run.credits >= UPGRADES.meche2.cost && !reachable()) {
      const ghost = { upgrades: new Set(run.rig.upgrades) };
      ghost.upgrades.add('meche2');
      if (reachable(ghost)) {
        const before = run.credits;
        if (buy(run, 'meche2')) log.push({ t: 'achat', id: 'meche2', prix: before - run.credits, credits: run.credits, fuel: run.rig.fuel });
      }
    }
    const fueled = refuel(run);
    if (fueled > 0) log.push({ t: 'plein', unites: fueled, credits: run.credits, fuel: +run.rig.fuel.toFixed(1) });
  }

  function heatWouldHurt(nx, ny, tile) {
    if (ny <= CFG.HEAT_ROW || run.rig.upgrades.has('isolation')) return false;
    const secs = travelSeconds(tile, x, y, nx, ny, run.rig);
    const extra = Math.floor((hazards.heatAcc + secs) / CFG.HEAT_PERIOD_S);
    return extra > 0 && run.rig.hull - extra < 20;
  }

  function stairIndexAt(px, py) {
    for (let i = stair.length - 1; i >= 0; i--) {
      if (stair[i][0] === px && stair[i][1] === py) return i;
    }
    return -1;
  }

  function climbCost(index) {
    let c = 0;
    let cx = stair[index][0];
    let cy = stair[index][1];
    for (let i = index - 1; i >= 0; i--) {
      const nx = stair[i][0];
      const ny = stair[i][1];
      c += nx !== cx ? HORIZ : (ny < cy ? UP : 0);
      cx = nx;
      cy = ny;
    }
    c += cx === mine.shaftX ? UP : HORIZ + UP;
    return c;
  }

  function retreat() {
    if (atPad()) return false;
    const si = stairIndexAt(x, y);
    let nx;
    let ny;
    if (si > 0) {
      nx = stair[si - 1][0];
      ny = stair[si - 1][1];
    } else if (si === 0) {
      nx = mine.shaftX;
      ny = 0;
    } else {
      const nxt = stepToward(mine.shaftX, 0);
      const back = nxt && stepCost(mine, run.rig, x, y, nxt.x, nxt.y);
      if (!nxt || back == null || back > run.rig.fuel + 1e-6) {
        raison = 'bloque';
        log.push({ t: 'bloque', x, y, fuel: +run.rig.fuel.toFixed(1), credits: run.credits, horsEscalier: true });
        return false;
      }
      payMove(nxt.x, nxt.y);
      return true;
    }
    const step = stepCost(mine, run.rig, x, y, nx, ny);
    if (step == null || step > run.rig.fuel + 1e-6) {
      raison = 'bloque';
      log.push({ t: 'bloque', x, y, fuel: +run.rig.fuel.toFixed(1), credits: run.credits, vers: [nx, ny] });
      return false;
    }
    payMove(nx, ny);
    return true;
  }

  function stepToward(tx, ty) {
    if (x === tx && y === ty) return null;
    const prev = new Map();
    const seen = new Set([y * mine.w + x]);
    const q = [[x, y]];
    let found = false;
    for (let qi = 0; qi < q.length && !found; qi++) {
      const [cx, cy] = q[qi];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ox = cx + dx;
        const oy = cy + dy;
        const id = oy * mine.w + ox;
        if (seen.has(id)) continue;
        if (stepCost(mine, run.rig, cx, cy, ox, oy) == null) continue;
        seen.add(id);
        prev.set(id, [cx, cy]);
        if (ox === tx && oy === ty) { found = true; break; }
        q.push([ox, oy]);
      }
    }
    if (!found) return null;
    let cx = tx;
    let cy = ty;
    let parent = prev.get(cy * mine.w + cx);
    while (parent && !(parent[0] === x && parent[1] === y)) {
      cx = parent[0];
      cy = parent[1];
      parent = prev.get(cy * mine.w + cx);
    }
    return { x: cx, y: cy };
  }

  function fuelTo(tx, ty) {
    if (x === tx && y === ty) return 0;
    const dist = new Map([[y * mine.w + x, 0]]);
    const q = [[x, y, 0]];
    for (let qi = 0; qi < q.length; qi++) {
      const [cx, cy, cost] = q[qi];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ox = cx + dx;
        const oy = cy + dy;
        const id = oy * mine.w + ox;
        if (dist.has(id)) continue;
        const st = stepCost(mine, run.rig, cx, cy, ox, oy);
        if (st == null) continue;
        const nc = cost + st;
        dist.set(id, nc);
        if (ox === tx && oy === ty) return nc;
        q.push([ox, oy, nc]);
      }
    }
    return Infinity;
  }

  services();
  let loops = 0;
  let side = null;
  let headingHome = false;
  let stagnant = 0;
  let markY = -1;
  let markSold = -1;
  while (run.status === 'play' && steps < stepCap && loops < loopCap && run.rig.hull > 0) {
    loops += 1;
    if (y > 0 && run.onPad) leavePad(run);
    if (headingHome) {
      if (atPad()) {
        headingHome = false;
        services();
        if (maxY <= markY && run.sold <= markSold) stagnant += 1;
        else stagnant = 0;
        markY = maxY;
        markSold = run.sold;
        if (stagnant >= 2) {
          raison = 'chemin';
          log.push({ t: 'chemin', x, y, fuel: +run.rig.fuel.toFixed(1), credits: run.credits, maxY });
          break;
        }
        continue;
      }
      if (!retreat()) break;
      continue;
    }
    if ((run.rig.heart || run.rig.cargo.length >= run.rig.cargoMax || run.rig.hull < 25) && !atPad()) {
      if (!retreat()) break;
      if (atPad()) services();
      continue;
    }
    if (side) {
      const gone = !TILE_INFO[mine.get(side.tx, side.ty)].solid;
      let backNow = run.rig.cargo.length >= run.rig.cargoMax || run.rig.heart || run.rig.hull < 25 || gone;
      if (!backNow) {
        const nxt = stepToward(side.tx, side.ty);
        const st = nxt && stepCost(mine, run.rig, x, y, nxt.x, nxt.y);
        const backCost = fuelTo(side.ax, side.ay);
        if (nxt && st != null && Number.isFinite(backCost) && 2 * st + backCost + side.home <= run.rig.fuel - 0.25) {
          payMove(nxt.x, nxt.y);
          continue;
        }
        backNow = true;
      }
      if (x === side.ax && y === side.ay) side = null;
      else {
        const nxt = stepToward(side.ax, side.ay);
        const st = nxt && stepCost(mine, run.rig, x, y, nxt.x, nxt.y);
        if (!nxt || st == null || st > run.rig.fuel + 1e-6) {
          raison = 'bloque';
          log.push({ t: 'bloque', x, y, fuel: +run.rig.fuel.toFixed(1), credits: run.credits, detour: [side.tx, side.ty] });
          break;
        }
        payMove(nxt.x, nxt.y);
        continue;
      }
    }
    const si = stairIndexAt(x, y);
    let nx;
    let ny;
    let fromIndex;
    if (si < 0) {
      let dug = -1;
      let target = null;
      for (let i = 0; i < stair.length; i++) {
        const [cx, cy] = stair[i];
        const solid = TILE_INFO[mine.get(cx, cy)].solid;
        if (!solid) dug = i;
        if (solid || (cx === mine.heart.x && cy === mine.heart.y)) { target = [cx, cy]; break; }
      }
      if (dug >= 0 && climbCost(dug) + 1 > run.rig.fuel) {
        raison = 'fonds';
        log.push({
          t: 'fonds', x, y, fuel: +run.rig.fuel.toFixed(1), credits: run.credits,
          frontiere: stair[dug][1], retour: +climbCost(dug).toFixed(1),
        });
        break;
      }
      const direct = stepCost(mine, run.rig, x, y, stair[0][0], stair[0][1]);
      if (direct != null && dug < 0) {
        nx = stair[0][0];
        ny = stair[0][1];
      } else if (target) {
        const fwd = searchFrom(mine, run.rig, x, y);
        const j = mine.idx(target[0], target[1]);
        const path = Number.isFinite(fwd.dist[j]) ? rebuild(fwd.prev, mine.w, y * mine.w + x, j) : null;
        if (!path?.length) {
          raison = 'chemin';
          log.push({ t: 'chemin', x, y, fuel: +run.rig.fuel.toFixed(1), credits: run.credits, frontiere: target[1] });
          break;
        }
        nx = path[0] % mine.w;
        ny = (path[0] / mine.w) | 0;
      } else {
        nx = stair[0][0];
        ny = stair[0][1];
      }
      fromIndex = -1;
    } else if (si + 1 < stair.length) {
      nx = stair[si + 1][0];
      ny = stair[si + 1][1];
      fromIndex = si;
    } else {
      if (!atPad() && !run.rig.heart) {
        if (!retreat()) break;
        if (atPad()) services();
        continue;
      }
      raison = run.rig.heart ? 'coeur' : 'chemin';
      if (atPad() && !run.rig.heart) {
        log.push({ t: raison, x, y, fuel: +run.rig.fuel.toFixed(1), credits: run.credits });
        break;
      }
      if (atPad()) break;
      continue;
    }
    if (nx === x && ny === y) {
      raison = 'chemin';
      break;
    }
    if (si >= 0 && oreSteps < 12 && run.rig.cargo.length < run.rig.cargoMax && maxY < mine.heart.y - 30) {
      const home = climbCost(si);
      const q = [[x, y, 0]];
      const seen = new Set([y * mine.w + x]);
      let best = null;
      for (let qi = 0; qi < q.length; qi++) {
        const [cx, cy, cost] = q[qi];
        if (cost >= 8) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ox = cx + dx;
          const oy = cy + dy;
          const id = oy * mine.w + ox;
          if (seen.has(id)) continue;
          const st = stepCost(mine, run.rig, cx, cy, ox, oy);
          if (st == null) continue;
          const nc = cost + st;
          if (nc > 8) continue;
          seen.add(id);
          q.push([ox, oy, nc]);
          const value = TILE_INFO[mine.get(ox, oy)].value;
          if (!value || value < 2 * nc || 2 * nc + home > run.rig.fuel - 0.25) continue;
          if (!best || value / nc > best.value / best.cost || (value === best.value && nc < best.cost)) {
            best = { x: ox, y: oy, value, cost: nc };
          }
        }
      }
      if (best && !heatWouldHurt(best.x, best.y, mine.get(best.x, best.y))) {
        side = { tx: best.x, ty: best.y, ax: x, ay: y, home: climbCost(si) };
        oreSteps += 1;
        continue;
      }
    }
    let step = stepCost(mine, run.rig, x, y, nx, ny);
    if (step == null && si >= 0 && stair.length < mine.h * 6) {
      const kind = mine.get(nx, ny);
      const blocked = kind === TILE.GAZ || kind === TILE.ROCMERE || (kind === TILE.DURE && !run.rig.upgrades.has('meche2'));
      if (blocked) stair.splice(si + 1, 1);
      else {
        const ix = Math.sign(nx - x);
        const iy = Math.sign(ny - y);
        const options = [];
        if (ix) options.push([x + ix, y]);
        if (iy) options.push([x, y + iy]);
        const hop = options.find((p) => stepCost(mine, run.rig, x, y, p[0], p[1]) != null);
        if (hop) stair.splice(si + 1, 0, hop);
        else stair.splice(si + 1, 1);
      }
      continue;
    }
    const homeNow = fuelTo(mine.shaftX, 0);
    const ret = (Number.isFinite(homeNow) ? homeNow : Infinity) + edgeBack(x, y, nx, ny);
    const tile = mine.get(nx, ny);
    if (step == null || step + ret > run.rig.fuel - 0.25 || heatWouldHurt(nx, ny, tile)) {
      if (!atPad()) {
        if (!headingHome) {
          log.push({
            t: 'demi-tour', x, y, fuel: +run.rig.fuel.toFixed(1), credits: run.credits,
            retour: Number.isFinite(ret) ? +ret.toFixed(1) : null, visee: ny, pas: step,
          });
        }
        headingHome = true;
        if (!retreat()) break;
        if (atPad()) services();
        continue;
      }
      raison = tile && heatWouldHurt(nx, ny, tile) ? 'chaleur' : (step == null ? 'chemin' : 'fonds');
      log.push({
        t: raison, x, y, nx, ny, fuel: +run.rig.fuel.toFixed(1), credits: run.credits,
        retour: Number.isFinite(ret) ? +ret.toFixed(1) : null, visee: ny, pas: step,
        tuile: mine.get(nx, ny),
      });
      break;
    }
    if (atPad()) log.push({ t: 'depart', fuel: +run.rig.fuel.toFixed(1), credits: run.credits, visee: ny });
    payMove(nx, ny);
    if (atPad()) services();
  }
  if (run.rig.hull <= 0 && run.status === 'play') {
    run.status = 'lost';
    raison = 'coque';
    log.push({ t: 'coque', x, y, fuel: +run.rig.fuel.toFixed(1) });
  }
  services();
  const spentCredits = log.filter((e) => e.t === 'achat').reduce((s, e) => s + e.prix, 0)
    + log.filter((e) => e.t === 'plein').reduce((s, e) => s + e.unites, 0)
    + log.filter((e) => e.t === 'reparer').reduce((s, e) => s + e.points * 2, 0);
  const conservation = {
    entre: CFG.START_CREDITS + run.sold,
    sort: run.credits + spentCredits,
  };
  conservation.ok = Math.abs(conservation.entre - conservation.sort) < 1e-6;
  if (!conservation.ok) log.push({ t: 'conservation', ...conservation });
  return {
    seed,
    victoire: run.status === 'won',
    statut: run.status,
    raison,
    credits: run.credits,
    vendu: run.sold,
    fuel: Math.round(run.rig.fuel * 10) / 10,
    coque: Math.round(run.rig.hull),
    y,
    x,
    etapes: steps,
    carburantBrule: Math.round(fuelSpent * 10) / 10,
    ameliorations: [...run.rig.upgrades],
    coeur: run.rig.heart,
    maxY,
    conservation,
    log,
  };
}

export const simulate = (seed, opts) => simulateMine(generateMine(seed), { seed, ...opts });

function report(seeds, label) {
  const t0 = Date.now();
  const perTile = CFG.FUEL_THRUST / CFG.THRUST_SPEED;
  console.log(`\n== ${label} forage=${CFG.FUEL_PER_TILE} montee=${perTile} thrust=${CFG.FUEL_THRUST}/s vitesse=${CFG.THRUST_SPEED} credits=${CFG.START_CREDITS} ==`);
  const rows = [];
  for (const s of seeds) {
    rows.push(simulate(s));
    const r = rows[rows.length - 1];
    const achats = r.ameliorations.join('+') || '-';
    console.log(`${r.seed} victoire=${r.victoire ? 'oui' : 'non'} statut=${r.statut} raison=${r.raison} y=${r.y} maxY=${r.maxY} fuel=${r.fuel} coque=${r.coque} vendu=${r.vendu} credits=${r.credits} brule=${r.carburantBrule} etapes=${r.etapes} achats=${achats} cons=${r.conservation.ok ? 'ok' : 'NON'}`);
    if (process.env.FB_ONLY) console.log(r.log);
  }
  const wins = rows.filter((r) => r.victoire).length;
  console.log(`RESULTAT ${wins}/${rows.length} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const sample = rows.find((r) => r.victoire) || rows[0];
  if (sample) {
    console.log('TRACE', sample.seed, JSON.stringify(sample.log.filter((e) => e.t !== 'plein' || e.unites >= 5).slice(0, 24)));
  }
  return { wins, n: rows.length, rows, ms: Date.now() - t0 };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const only = process.env.FB_ONLY ? [Number(process.env.FB_ONLY)] : null;
  const seeds = only || Array.from({ length: 20 }, (_, i) => 1001 + i);
  const out = report(seeds, 'plan');
  const hold = !only && process.env.FB_HOLDOUT === '1'
    ? report(Array.from({ length: 20 }, (_, i) => 2001 + i), 'holdout')
    : null;
  if (process.env.FB_JSON) {
    fs.writeFileSync(process.env.FB_JSON, JSON.stringify({
      thrust: CFG.FUEL_THRUST,
      perTile: UP,
      main: out.rows,
      holdout: hold ? hold.rows : null,
    }));
  }
  process.exit(out.wins >= 0 ? 0 : 1);
}
