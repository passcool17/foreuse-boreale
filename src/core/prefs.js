const KEY = 'fb.prefs';
const DEF = { music: true, volume: 0.6, tutorialDone: false, best: 0 };

export function loadPrefs(s) {
  try {
    const raw = JSON.parse(s.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return { ...DEF };
    return {
      music: typeof raw.music === 'boolean' ? raw.music : DEF.music,
      volume: Number.isFinite(raw.volume) ? Math.min(1, Math.max(0, raw.volume)) : DEF.volume,
      tutorialDone: raw.tutorialDone === true,
      best: Number.isFinite(raw.best) && raw.best > 0 ? raw.best : 0,
    };
  } catch {
    return { ...DEF };
  }
}

export function savePrefs(s, p) {
  try {
    s.setItem(KEY, JSON.stringify({
      music: p.music === true,
      volume: Math.min(1, Math.max(0, Number(p.volume) || 0)),
      tutorialDone: p.tutorialDone === true,
      best: Number(p.best) || 0,
    }));
  } catch {
    /* stockage refusé : on continue sans */
  }
}

/** L'entraînement n'inscrit aucun record. Seul un score strictement meilleur compte. */
export function recordScore(p, run, sc) {
  if (run.tutorial || !(sc > p.best)) return false;
  p.best = sc;
  return true;
}
