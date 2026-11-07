import { bridge } from './bridge.js';
import { UPGRADE_ORDER, UPGRADES } from '../core/economy.js';
import { refuelUnits } from '../core/run.js';
import { appearance, cssColor } from './palette.js';
import { TILE } from '../core/tiles.js';
import { press, release } from '../core/input.js';

const UP_LABEL = {
  reservoir: ['Réservoir+', 'Carburant max 160, jauge pleine'],
  soute: ['Soute+', 'Soute de 18'],
  meche2: ['Mèche II', 'Fore la roche dure, forage 30 % plus rapide'],
  blindage: ['Blindage', 'Coque max 160, jauge pleine'],
  isolation: ['Isolation', 'Aucun dégât de chaleur'],
};

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function temps(s) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, '0')} s`;
}

export function createHud(root) {
  root.innerHTML = '';
  const menu = el(`<section class="ecran" id="menu"></section>`);
  const hud = el(`<div class="hud"></div>`);
  const message = el(`<div id="message" class="cache"></div>`);
  const tuto = el(`<div id="tuto" class="cache"><p></p><button type="button" id="passer">Passer</button></div>`);
  const manettes = el(`
    <div class="manettes cache">
      <div class="croix">
        <button type="button" class="touche" data-hold="left" aria-label="Rouler à gauche">◀</button>
        <button type="button" class="touche" data-hold="down" aria-label="Forer vers le bas">▼</button>
        <button type="button" class="touche" data-hold="right" aria-label="Rouler à droite">▶</button>
      </div>
      <button type="button" class="propulseur" data-hold="thrust" aria-label="Propulseur">Propulseur</button>
      <div class="outils">
        <button type="button" class="touche" data-tap="survey" aria-label="Sonder">Sonder</button>
        <button type="button" class="touche cache" data-tap="workshop" id="atelier" aria-label="Atelier">Atelier</button>
        <button type="button" class="touche" data-tap="pause" aria-label="Pause">Pause</button>
        <button type="button" class="touche" data-tap="mute" aria-label="Son">Son</button>
      </div>
    </div>`);
  const voile = el(`<div class="voile cache"><div class="panneau" id="panneau"></div></div>`);
  root.append(menu, hud, message, tuto, manettes, voile);

  const fields = {};
  const addPuce = (id, label) => {
    const p = el(`<div class="puce" data-field="${id}"><span class="nom"></span> <b></b><i class="barre" hidden><i></i></i></div>`);
    p.querySelector('.nom').textContent = label;
    hud.append(p);
    fields[id] = p;
  };
  addPuce('fuel', 'Carburant');
  addPuce('hull', 'Coque');
  addPuce('cargo', 'Soute');
  addPuce('credits', 'Crédits');
  addPuce('depth', 'Profondeur');
  addPuce('reserve', 'Réserve');
  addPuce('time', 'Temps');
  for (const id of ['fuel', 'hull', 'cargo']) fields[id].querySelector('.barre').hidden = false;
  fields.fuel.querySelector('.barre').classList.add('carb');
  fields.hull.querySelector('.barre').classList.add('coque');
  fields.cargo.querySelector('.barre').classList.add('soute');

  const mapCanvas = document.createElement('canvas');
  mapCanvas.id = 'carte-cvs';
  let mode = '';
  let panelKey = '';
  let view = null;

  const scene = () => bridge.game?.scene.getScene('mine');

  function bindHold(button) {
    const action = button.dataset.hold;
    const down = (e) => {
      const sc = scene();
      if (!sc?.inputMap || sc.run?.paused || sc.run?.workshopOpen) return;
      button.setPointerCapture?.(e.pointerId);
      press(sc.inputMap, action, `p${e.pointerId}`);
      button.classList.add('actif');
      sc.audio?.onGesture();
    };
    const up = (e) => {
      const sc = scene();
      if (sc?.inputMap) release(sc.inputMap, action, `p${e.pointerId}`);
      button.classList.remove('actif');
    };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerout', up);
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  manettes.querySelectorAll('[data-hold]').forEach(bindHold);

  tuto.querySelector('#passer').addEventListener('click', () => scene()?.skipTraining());

  manettes.querySelectorAll('[data-tap]').forEach((button) => {
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const sc = scene();
      if (!sc) return;
      sc.audio?.onGesture();
      const tap = button.dataset.tap;
      if (tap === 'pause') sc.togglePause();
      else if (tap === 'mute') sc.toggleSound();
      else if (tap === 'survey') sc.trySurvey();
      else if (tap === 'workshop') sc.openWorkshop();
    });
  });

  function gauge(id, value, max, text) {
    const p = fields[id];
    p.querySelector('b').textContent = text;
    const bar = p.querySelector('.barre > i');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  }

  function fuelText(v) {
    if (v.fuel >= v.fuelMax - 0.05) return String(v.fuelMax);
    return String(Math.floor(v.fuel));
  }

  function drawMap(v) {
    if (!v.mine) return;
    const cell = 6;
    const w = v.mine.w;
    const h = v.mine.h;
    mapCanvas.width = w * cell;
    mapCanvas.height = h * cell;
    const ctx = mapCanvas.getContext('2d');
    ctx.fillStyle = '#0c1210';
    ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!v.knowledge[v.mine.idx(x, y)]) continue;
        const tile = v.mine.get(x, y);
        const look = appearance(tile, y, true);
        ctx.fillStyle = cssColor(look.color);
        ctx.fillRect(x * cell, y * cell, cell, cell);
        if (tile === TILE.COEUR) {
          ctx.fillStyle = '#ffd0d8';
          ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
        }
      }
    }
    ctx.strokeStyle = '#e7a04a';
    ctx.strokeRect(v.cellX * cell + 0.5, v.cellY * cell + 0.5, cell - 1, cell - 1);
    const wrap = mapCanvas.parentElement;
    if (wrap && !wrap.dataset.centered) {
      wrap.scrollTop = Math.max(0, v.cellY * cell - wrap.clientHeight / 2);
      wrap.scrollLeft = Math.max(0, v.cellX * cell - wrap.clientWidth / 2);
      wrap.dataset.centered = '1';
    }
  }

  function renderMenu(v) {
    const seed = v.urlSeed == null ? 'aléatoire' : String(v.urlSeed);
    menu.replaceChildren(el(`
      <div class="carte-menu">
        <h1>Foreuse Boréale</h1>
        <p class="lede">Descends sous le pergélisol, lis le terrain, et ramène le Cœur boréal. Pas de chrono : la route compte plus que la vitesse.</p>
        <p class="meta"></p>
        <ul class="liste">
          <li>A et D, ou les flèches gauche et droite, roulent et forent sur le côté. S ou la flèche bas : forer vers le bas, en maintenant.</li>
          <li>W, flèche haut ou Espace : propulseur. R : sonder. Échap : pause et carte.</li>
          <li>La réserve de retour est une estimation, pas une garantie.</li>
        </ul>
        <div class="actions">
          <button type="button" data-go="play">Jouer</button>
          <button type="button" data-go="tutorial">Entraînement</button>
          <button type="button" data-go="mute">Son : …</button>
        </div>
        <p class="note">Un rechargement abandonne la partie. Seuls le son, le volume, l’entraînement terminé et le meilleur score sont gardés sur cet appareil.</p>
      </div>`));
    menu.querySelector('.meta').textContent = v.best > 0
      ? `Graine proposée : ${seed} · Meilleur score : ${v.best}`
      : `Graine proposée : ${seed}`;
    menu.querySelector('[data-go="mute"]').textContent = v.music ? 'Son : ouvert' : 'Son : fermé';
    menu.querySelector('[data-go="play"]').addEventListener('click', () => scene()?.startGame(false));
    menu.querySelector('[data-go="tutorial"]').addEventListener('click', () => scene()?.startGame(true));
    menu.querySelector('[data-go="mute"]').addEventListener('click', () => scene()?.toggleSound());
  }

  function renderPanel(v) {
    const box = voile.querySelector('#panneau');
    box.replaceChildren();
    const h2 = document.createElement('h2');
    const actions = el('<div class="grille-boutons"></div>');
    const add = (label, fn, opts = {}) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (opts.disabled) b.disabled = true;
      b.addEventListener('click', fn);
      actions.append(b);
      return b;
    };
    if (v.mode === 'pause') {
      h2.textContent = 'Pause';
      const p = document.createElement('p');
      p.className = 'lede';
      p.textContent = 'Tout est figé. Tu peux lire la carte connue et choisir la suite.';
      box.append(h2, p, actions);
      add('Reprendre', () => scene()?.resume());
      add('Carte connue', () => scene()?.openMap());
      add('Entraînement', () => scene()?.startGame(true));
      if (v.depth > 0) add('Remorquer…', () => scene()?.askTow());
      add('Abandonner', () => scene()?.abandon());
      add(v.music ? 'Couper le son' : 'Ouvrir le son', () => scene()?.toggleSound());
    } else if (v.mode === 'map') {
      h2.textContent = 'Carte connue';
      const p = document.createElement('p');
      p.className = 'lede';
      p.textContent = 'Glisse pour regarder plus loin. Seul le terrain déjà vu ou sondé est dessiné.';
      const wrap = el('<div class="carte-wrap"></div>');
      wrap.append(mapCanvas);
      delete wrap.dataset.centered;
      box.append(h2, p, wrap, actions);
      add('Fermer la carte', () => scene()?.closeMap());
      let drag = null;
      wrap.addEventListener('pointerdown', (e) => {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop };
        wrap.setPointerCapture(e.pointerId);
      });
      wrap.addEventListener('pointermove', (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        wrap.scrollLeft = drag.sl - (e.clientX - drag.x);
        wrap.scrollTop = drag.st - (e.clientY - drag.y);
      });
      const end = () => { drag = null; };
      wrap.addEventListener('pointerup', end);
      wrap.addEventListener('pointercancel', end);
      drawMap(v);
    } else if (v.mode === 'workshop') {
      h2.textContent = 'Atelier';
      const p = document.createElement('p');
      p.className = 'lede';
      p.textContent = 'La physique est gelée. Le plein et la réparation s’arrêtent à tes crédits.';
      box.append(h2, p, actions);
      const fuelN = refuelUnits({ rig: { fuel: v.fuel, fuelMax: v.fuelMax }, credits: v.credits });
      const hullGap = Math.max(0, v.hullMax - v.hull);
      const hullN = Math.min(hullGap, Math.floor(v.credits / 2));
      add(fuelN > 0 ? `Plein (${fuelN} crédit${fuelN > 1 ? 's' : ''})` : 'Plein', () => scene()?.doRefuel(), { disabled: fuelN <= 0 });
      add(hullN > 0 ? `Réparer (${hullN * 2} crédits)` : 'Réparer', () => scene()?.doRepair(), { disabled: hullN <= 0 });
      for (const id of UPGRADE_ORDER) {
        const owned = v.upgrades.includes(id);
        const cost = UPGRADES[id].cost;
        const [name, effet] = UP_LABEL[id];
        add(owned ? `${name} — déjà en place` : `${name} — ${cost} crédits. ${effet}`, () => scene()?.doBuy(id), {
          disabled: owned || v.credits < cost,
        });
      }
      if (v.rescue) {
        const note = document.createElement('p');
        note.className = 'lede';
        note.textContent = 'Dépannage unique : le Poste met le carburant à 40, sans crédits et sans l’ajouter au score. Une seule fois par mine. Ça ne ramène pas le Cœur.';
        actions.append(note);
        add('Accepter le dépannage', () => scene()?.doRescue());
      } else if (v.rescueUsed) {
        const note = document.createElement('p');
        note.className = 'note';
        note.textContent = 'Le dépannage de cette mine a déjà été utilisé.';
        actions.append(note);
      }
      add('Fermer l’atelier', () => scene()?.closeWorkshop());
    } else if (v.mode === 'tow') {
      h2.textContent = 'Remorquage';
      const p = document.createElement('p');
      p.className = 'lede';
      p.textContent = v.credits >= 50
        ? 'Coût : 50 crédits. La soute est perdue. Le Cœur retourne à sa tuile d’origine.'
        : 'Il te faut 50 crédits. Sans ça, le remorquage est une défaite.';
      box.append(h2, p, actions);
      add('Confirmer le remorquage', () => scene()?.confirmTow());
      add('Annuler', () => scene()?.cancelTow());
    } else if (v.mode === 'end') {
      const titre = v.status === 'won' ? 'Victoire' : (v.status === 'abandoned' ? 'Partie abandonnée' : 'Défaite');
      h2.textContent = titre;
      const p = document.createElement('p');
      p.className = 'lede';
      const cause = v.cause === 'hull' ? 'La coque a cédé. ' : (v.cause === 'tow' ? 'Pas assez de crédits pour le remorquage. ' : '');
      p.textContent = `${cause}Score : ${v.score}. Graine ${v.seed}. Temps joué (informatif) : ${temps(v.playedS)}. Le temps n’entre pas dans le score.`;
      box.append(h2, p, actions);
      add('Rejouer cette mine', () => scene()?.replay());
      add('Nouvelle mine', () => scene()?.newMine());
      add('Menu', () => scene()?.goMenu());
    } else if (v.mode === 'train-done') {
      h2.textContent = 'Entraînement terminé';
      const p = document.createElement('p');
      p.className = 'lede';
      p.textContent = 'Aucun score n’a été enregistré. La vraie mine t’attend, à ton rythme.';
      box.append(h2, p, actions);
      add('Jouer une mine', () => scene()?.startGame(false));
      add('Menu', () => scene()?.goMenu());
    }
    if (v.mode === 'map') drawMap(v);
  }

  const api = {
    setGame(game) { bridge.game = game; },
    sync(v) {
      view = v;
      root.classList.toggle('chaleur', !!v.heat);
      const playing = v.mode === 'play' || v.mode === 'pause' || v.mode === 'map' || v.mode === 'workshop' || v.mode === 'tow';
      menu.classList.toggle('cache', v.mode !== 'menu');
      hud.classList.toggle('cache', v.mode === 'menu' || v.mode === 'boot');
      manettes.classList.toggle('cache', v.mode !== 'play');
      const panel = v.mode === 'pause' || v.mode === 'map' || v.mode === 'workshop' || v.mode === 'tow' || v.mode === 'end' || v.mode === 'train-done';
      voile.classList.toggle('cache', !panel);
      if (v.mode === 'menu' && mode !== 'menu') renderMenu(v);
      if (playing || v.mode === 'end' || v.mode === 'train-done') {
        gauge('fuel', v.fuel, v.fuelMax, `${fuelText(v)}/${v.fuelMax}`);
        gauge('hull', v.hull, v.hullMax, `${Math.ceil(v.hull)}/${v.hullMax}`);
        gauge('cargo', v.cargo, v.cargoMax, v.heart ? `${v.cargo}/${v.cargoMax} · Cœur ✓` : `${v.cargo}/${v.cargoMax}`);
        fields.credits.querySelector('b').textContent = String(v.credits);
        fields.depth.querySelector('b').textContent = String(v.depth);
        fields.reserve.querySelector('b').textContent = v.depth > 0 ? `~${v.reserve}` : '—';
        fields.reserve.classList.toggle('chaud', v.depth > 0 && v.fuel < v.reserve);
        fields.reserve.title = 'Estimation prudente pour remonter, pas une garantie';
        fields.fuel.classList.toggle('bas', v.fuelMax > 0 && v.fuel / v.fuelMax < 0.25);
        fields.time.querySelector('b').textContent = temps(v.playedS);
        fields.time.title = 'Informatif seulement. Aucun score de vitesse.';
      }
      message.classList.toggle('cache', !v.message);
      message.textContent = v.message || '';
      tuto.classList.toggle('cache', !v.tutorialText);
      tuto.querySelector('p').textContent = v.tutorialText || '';
      const key = [
        v.mode, v.credits, v.fuelMax, Math.round(v.fuel), Math.round(v.hull), v.hullMax,
        v.upgrades.join(','), v.music, v.score, v.status, v.cause, v.seed, v.rescue, v.rescueUsed,
      ].join('|');
      if (panel && key !== panelKey) {
        panelKey = key;
        renderPanel(v);
      }
      if (!panel) panelKey = '';
      mode = v.mode;
      const son = manettes.querySelector('[data-tap="mute"]');
      if (son) son.textContent = v.music ? 'Son' : 'Muet';
      const atelier = manettes.querySelector('#atelier');
      if (atelier) atelier.classList.toggle('cache', !(v.onPad && v.mode === 'play'));
    },
  };
  bridge.hud = api;
  return api;
}
