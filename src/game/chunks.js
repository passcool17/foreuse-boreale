/** Fusionne une rangée de drapeaux solides en rectangles {x, w}. */
export function mergeRow(solids) {
  const runs = [];
  let start = null;
  for (let x = 0; x <= solids.length; x++) {
    const on = x < solids.length && solids[x];
    if (on) {
      if (start === null) start = x;
    } else if (start !== null) {
      runs.push({ x: start, w: x - start });
      start = null;
    }
  }
  return runs;
}
