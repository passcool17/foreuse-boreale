export const TUTORIAL_SEED = 20261106;

export const TUTORIAL_STEPS = [
  { id: 'rouler', texte: 'Roule avec A/D ou les flèches.', done: (e) => e.type === 'rouler' },
  { id: 'forerBas', texte: 'Maintiens S ou ↓ pour forer vers le bas.', done: (e) => e.type === 'forer' && e.dir === 'down' },
  { id: 'ramasser', texte: 'Touche une pépite pour la ramasser.', done: (e) => e.type === 'ramasser' },
  { id: 'propulseur', texte: 'Maintiens W, ↑ ou Propulseur pour monter.', done: (e) => e.type === 'propulseur' },
  { id: 'eviterBloc', texte: 'La roche fissurée tremble 2 s : éloigne-toi.', done: (e) => e.type === 'blocEvite' },
  { id: 'reculerGaz', texte: 'Des bulles ? Le gaz siffle 2 s : recule.', done: (e) => e.type === 'gazEvite' },
  { id: 'vendre', texte: 'Reviens au Poste pour vendre.', done: (e) => e.type === 'vente' },
];

export const advanceTutorial = (s, e) => (
  s.i < TUTORIAL_STEPS.length && TUTORIAL_STEPS[s.i].done(e) ? { i: s.i + 1 } : s
);
