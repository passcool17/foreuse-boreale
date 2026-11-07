import { generateMine } from '../src/core/mineGen.js';
import { checkMine } from '../test/helpers/checkMine.js';

const bad = [];
for (let s = 1; s <= 1000; s++) {
  let mine;
  try {
    mine = generateMine(s);
  } catch (err) {
    bad.push(`${s}: ${err.message}`);
    continue;
  }
  const e = checkMine(mine);
  if (e) bad.push(`${s}: ${e}`);
}
console.log(bad.length ? bad.join('\n') : 'OK 1000/1000');
process.exit(bad.length ? 1 : 0);
