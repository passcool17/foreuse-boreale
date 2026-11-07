import { CFG } from './config.js';

let seq = 1;

export const newPickups = () => ({ dynamic: [], static: [] });

export function spawnNugget(p, value, x, y) {
  const n = { id: seq++, value, x, y, restS: 0 };
  p.dynamic.push(n);
  if (p.dynamic.length > CFG.MAX_NUGGETS) p.static.push(p.dynamic.shift());
  return n;
}

export function restTick(p, id, atRest, dt) {
  const i = p.dynamic.findIndex((n) => n.id === id);
  if (i < 0) return;
  const n = p.dynamic[i];
  n.restS = atRest ? n.restS + dt : 0;
  if (n.restS >= CFG.NUGGET_STATIC_S) {
    p.dynamic.splice(i, 1);
    p.static.push(n);
  }
}

export function collect(p, id) {
  for (const list of [p.dynamic, p.static]) {
    const i = list.findIndex((n) => n.id === id);
    if (i >= 0) return list.splice(i, 1)[0];
  }
  return null;
}
