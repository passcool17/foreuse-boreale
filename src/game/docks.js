/**
 * Un quai ne flotte pas au-dessus d'une case vide.
 * Sinon la foreuse reste à ~30 px de la pépite forée dessous, hors du contact (24 px).
 */
export const dockRemains = (supportSolid) => !!supportSolid;
