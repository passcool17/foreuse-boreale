/** PRNG mulberry32. La suite est déterministe pour une graine uint32. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const parseSeed = (s) => (
  s != null && /^\d{1,10}$/.test(String(s)) ? (Number(s) >>> 0) : null
);

export const randomSeed = () => (Math.random() * 2 ** 32) >>> 0;
