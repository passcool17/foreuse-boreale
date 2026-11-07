export function createDrill() {
  return { key: null, p: 0, done: false, blocked: false };
}

/**
 * Le maintien fait avancer la progression. Relâcher la conserve.
 * Changer de tuile cible la remet à zéro. Une tuile interdite ne progresse pas.
 */
export function tickDrill(state, target, dt, duration, held, allowed = true) {
  if (!held || !target) {
    return { key: state.key, p: state.p, done: false, blocked: false };
  }
  const key = `${target.x},${target.y}`;
  const same = state.key === key;
  if (!allowed) {
    return { key, p: same ? state.p : 0, done: false, blocked: true };
  }
  const p = (same ? state.p : 0) + dt / duration;
  if (p >= 1) return { key: null, p: 0, done: true, blocked: false };
  return { key, p, done: false, blocked: false };
}
