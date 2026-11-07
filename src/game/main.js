import { MineScene } from './MineScene.js';
import { createHud } from './Hud.js';
import { bridge } from './bridge.js';

globalThis.__FB_BOOT = true;

const chargement = document.getElementById('chargement');
const Phaser = globalThis.Phaser;

function echecChargement(texte) {
  if (!chargement) return;
  chargement.className = 'echec';
  chargement.textContent = texte;
}

if (!Phaser) {
  echecChargement('Phaser n’a pas chargé. Ouvre Foreuse-Boreale.html plutôt que cette page.');
} else {
  try {
  createHud(document.getElementById('ui'));
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'jeu',
    backgroundColor: '#101614',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1, scale: 0.001 },
        debug: false,
        autoUpdate: false,
        enableSleeping: false,
      },
    },
    scene: [MineScene],
    banner: false,
  });
  bridge.game = game;
  bridge.hud?.setGame(game);
  game.events.once('ready', () => chargement?.remove());
  } catch (err) {
    echecChargement('Le jeu n’a pas démarré. ' + (err && err.message ? err.message : err));
  }
}
