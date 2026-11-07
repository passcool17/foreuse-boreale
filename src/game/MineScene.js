import { CFG } from '../core/config.js';
import { TILE, TILE_INFO, stratumTile, isOre } from '../core/tiles.js';
import { generateMine } from '../core/mineGen.js';
import { tutorialMine } from '../core/tutorialMine.js';
import { newCollapse, afterDrill, advanceWarnings, trySettle, removeBlock } from '../core/collapse.js';
import { newPickups, spawnNugget, restTick, collect } from '../core/pickups.js';
import { newHazards, armGasNear, armGasCell, advanceGas, heatTick, inBlast } from '../core/hazards.js';
import { newKnowledge, reveal, survey, returnReserve } from '../core/knowledge.js';
import { newRig, fuelDrain, onTileDrilled, speedFactor, canThrust, pickNugget, pickHeart, fallDamage, impactDamage, damage } from '../core/rig.js';
import { canDrillTile, drillTime } from '../core/economy.js';
import { newRun, arriveAtPad, leavePad, buy, refuel, repair, tow, checkEnd, score, tick, abandon,
  canRescue, rescue, seedFromUrl, urlForSeed } from '../core/run.js';
import { newInput, press, release, releaseAll, isDown, KEYMAP } from '../core/input.js';
import { loadPrefs, savePrefs, recordScore } from '../core/prefs.js';
import { randomSeed } from '../core/rng.js';
import { createDrill, tickDrill } from '../core/drill.js';
import { makeStepper } from './loop.js';
import { mergeRow } from './chunks.js';
import { appearance, nuggetColor } from './palette.js';
import { dockRemains } from './docks.js';
import { Audio } from './audio.js';
import { TUTORIAL_STEPS, advanceTutorial, TUTORIAL_SEED } from './tutorial.js';
import { bridge } from './bridge.js';

const PhaserRef = () => globalThis.Phaser;
const CAT = { SOLID: 0x0001, NUGGET: 0x0002, BLOCK: 0x0004 };
const CHUNK = CFG.CHUNK;

function matter() {
  return PhaserRef().Physics.Matter.Matter;
}

export class MineScene extends PhaserRef().Scene {
  constructor() {
    super('mine');
  }

  init(data) {
    this.launch = data || {};
    this.inputMap = newInput();
  }

  create() {
    this.detachInput();
    this.prefs = loadPrefs(localStorage);
    this.audio = new Audio(this, this.prefs);
    this.bindInput();
    const params = new URLSearchParams(location.search);
    const debugParam = params.get('debug');
    const wantsDebug = debugParam === 'collapse';
    const rescueSetup = debugParam === 'rescue-setup';
    const autostart = params.get('autostart') === '1' || rescueSetup;
    if (this.launch.menu) {
      this.run = null;
      this.mode = 'menu';
      this.pushView();
      document.getElementById('chargement')?.remove();
      return;
    }
    if (this.launch.seed != null || this.launch.tutorial) {
      this.begin({
        seed: this.launch.seed ?? TUTORIAL_SEED,
        tutorial: !!this.launch.tutorial,
        debug: this.launch.debug || null,
      });
      return;
    }
    if (!this.launch.menu && (wantsDebug || autostart)) {
      this.begin({
        seed: seedFromUrl(location.search) ?? 7,
        tutorial: params.get('tutorial') === '1',
        debug: wantsDebug ? 'collapse' : (rescueSetup ? 'rescue-setup' : null),
      });
      return;
    }
    this.run = null;
    this.mode = 'menu';
    this.pushView();
    document.getElementById('chargement')?.remove();
  }

  begin({ seed, tutorial, debug }) {
    this.destroyMatter();
    this.children.removeAll(true);
    this.run = newRun(seed, { tutorial });
    this.debug = debug || null;
    this.mine = tutorial ? tutorialMine() : generateMine(seed);
    this.collapse = newCollapse();
    this.pickups = newPickups();
    this.hazards = newHazards();
    this.knowledge = newKnowledge(this.mine);
    this.drill = createDrill();
    this.chunkBodies = new Map();
    this.chunkGfx = new Map();
    this.blockBodies = new Map();
    this.nuggetBodies = new Map();
    this.dockBodies = new Map();
    this.sleepingCells = new Set();
    this.hitCooldown = new Map();
    this.watches = new Map();
    this.stepper = makeStepper((dt) => this.fixedStep(dt), CFG.STEP_HZ, CFG.MAX_SUBSTEPS);
    this.simTime = 0;
    this.toastText = '';
    this.toastUntil = 0;
    this.fallFrom = null;
    this.rollPx = 0;
    this.prevX = 0;
    this.drillActive = false;
    this.thrusting = false;
    this.mapOpen = false;
    this.towAsk = false;
    this.finished = false;
    this.trainCelebrated = false;
    this.tut = { i: 0 };
    this.bad = 0;
    this.steps = 0;
    this.fps = 0;
    this.minFps = 999;
    this.maxBodies = 0;
    this.debugAcc = 0;
    this.debugElapsed = 0;
    this.fpsWarm = 0;
    this.lastCell = null;
    this.inHeat = false;
    const m = this.mine;
    for (let x = 0; x < m.w; x++) this.knowledge[m.idx(x, 0)] = 1;
    reveal(this.knowledge, m, m.shaftX, 0, CFG.REVEAL_RADIUS);
    this.rebuildAll();
    const startX = m.shaftX * 32 + 16;
    const startY = 18;
    this.rig = this.matter.add.rectangle(startX, startY, 28, 28, {
      label: 'rig',
      friction: 0.05,
      frictionStatic: 0.1,
      frictionAir: 0,
      restitution: 0,
      density: 0.002,
      chamfer: { radius: 6 },
      collisionFilter: { category: CAT.SOLID, mask: 0xFFFFFFFF & ~CAT.NUGGET },
    });
    matter().Body.setInertia(this.rig, Infinity);
    this.rig.ignoreGravity = true;
    this.camTarget = this.add.zone(startX, startY, 8, 8);
    this.cameras.main.startFollow(this.camTarget, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(64, 64);
    this.cameras.main.setBounds(0, -160, m.w * 32, m.h * 32 + 160);
    this.cameras.main.setBackgroundColor('#101614');
    this.applyZoom();
    this.onResize = () => this.applyZoom();
    this.scale.on('resize', this.onResize);
    this.dyn = this.add.graphics().setDepth(8);
    this.drawPad();
    this.addDocks();
    if (!tutorial && m.h > 40) this.drawStrata();
    if (this.onHitBound) this.matter.world.off('collisionstart', this.onHitBound);
    this.onHitBound = (ev) => this.onHit(ev);
    this.matter.world.on('collisionstart', this.onHitBound);
    this.prevX = startX;
    if (this.debug === 'collapse') {
      this.carveChimney();
      this.spawnDebugWave();
    }
    if (this.debug === 'rescue-setup') this.applyRescueSetup();
    document.getElementById('chargement')?.remove();
    this.pushView();
  }

  applyRescueSetup() {
    const x = (this.mine.shaftX - 1) * 32 + 16;
    matter().Body.setPosition(this.rig, { x, y: 18 });
    matter().Body.setVelocity(this.rig, { x: 0, y: 0 });
    this.rig.ignoreGravity = true;
    this.run.rig.fuel = 5;
    this.run.credits = 10;
    this.run.sold = 0;
    this.run.onPad = true;
    this.setupOnly = true;
    this.toast('Mise en place du bouton seulement : carburant 5, crédits 10. Ce n’est pas une partie jouée.');
  }

  addDocks() {
    const shaft = this.mine.shaftX;
    for (const dx of [-2, -1, 1, 2]) {
      const x = shaft + dx;
      const body = this.matter.add.rectangle(x * 32 + 16, 36, 30, 8, {
        isStatic: true,
        label: 'dock',
        friction: 0.95,
        restitution: 0,
        collisionFilter: { category: CAT.SOLID, mask: 0xFFFFFFFF },
      });
      this.dockBodies.set(x, body);
    }
  }

  syncDocks() {
    if (!this.dockBodies?.size) return;
    for (const [x, body] of [...this.dockBodies]) {
      if (dockRemains(this.solidAt(x, 1))) continue;
      this.matter.world.remove(body);
      this.dockBodies.delete(x);
    }
  }

  drawPad() {
    const g = this.add.graphics().setDepth(2);
    const x0 = (this.mine.shaftX - 2) * 32;
    g.fillStyle(0xe7a04a, 1);
    g.fillRect(x0, 26, 5 * 32, 6);
    this.add.text((this.mine.shaftX - 1) * 32, -34, 'Poste', {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e7a04a',
    }).setDepth(3);
  }

  drawStrata() {
    const names = ['Tourbe', 'Argile', 'Granite', 'Glace ancienne'];
    names.forEach((name, i) => {
      this.add.text(40, (i * CFG.STRATUM_ROWS + 6) * 32, name, {
        fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#f4efe6',
      }).setAlpha(0.8).setDepth(3);
    });
    const y = CFG.HEAT_ROW * 32;
    const line = this.add.graphics().setDepth(3);
    line.lineStyle(2, 0xe15d4a, 0.9);
    line.lineBetween(32, y, (this.mine.w - 1) * 32, y);
  }

  applyZoom() {
    const w = this.scale.width || window.innerWidth;
    const tiles = w < 700 ? 12 : 20;
    this.cameras.main.setZoom(w / (tiles * CFG.TILE_PX));
    this.cameras.main.setFollowOffset(0, w < 700 ? -110 : -24);
  }

  update(_time, delta) {
    if (this.run && this.currentMode() === 'play') {
      this.steps += this.stepper(Math.min(delta, 250) / 1000);
    }
    this.drawDynamic();
    this.trackFps(delta);
    if (this.camTarget && this.rig) this.camTarget.setPosition(this.rig.position.x, this.rig.position.y);
    this.pushView();
  }

  fixedStep(dt) {
    const run = this.run;
    if (!run || run.status !== 'play') return;
    this.simTime += dt;
    const grounded = this.isGrounded();
    const left = isDown(this.inputMap, 'left');
    const right = isDown(this.inputMap, 'right');
    this.thrusting = isDown(this.inputMap, 'thrust') && canThrust(run.rig);
    const dir = this.drillDir();
    const target = dir ? this.drillTarget(dir) : null;
    this.advanceDrill(dt, dir, target);
    this.resolveWarnings(dt);
    this.resolveGasDt(dt);
    this.syncDocks();
    this.applyMotion(grounded, left, right);
    if (dir && target && this.drillActive && !this.thrusting) this.alignTo(dir, target);
    this.matter.world.step(dt * 1000);
    this.capSpeeds();
    matter().Body.setAngle(this.rig, 0);
    this.clampRig();
    const groundedAfter = this.isGrounded();
    fuelDrain(run.rig, {
      thrust: this.thrusting,
      moving: grounded && (left || right) && !this.drillActive,
      drilling: this.drillActive,
    }, dt);
    this.updateHeat(dt);
    this.updateBlocks(dt);
    this.updateNuggets(dt);
    this.updateFall(groundedAfter);
    this.updatePad();
    this.updateReveal();
    this.watchDangers();
    if (grounded && (left || right)) {
      this.rollPx += Math.abs(this.rig.position.x - this.prevX);
      if (this.rollPx > 24) this.note({ type: 'rouler' });
    }
    if (this.thrusting && matter().Body.getVelocity(this.rig).y < -0.45) this.note({ type: 'propulseur' });
    this.prevX = this.rig.position.x;
    if (run.rig.hull <= 0 && run.status === 'play') run.cause = 'hull';
    if (this.debug === 'collapse') {
      if (run.rig.hull < 50) run.rig.hull = 100;
      this.debugAcc += dt;
      this.debugElapsed += dt;
      if (this.debugAcc >= 5) {
        this.debugAcc = 0;
        this.spawnDebugWave();
      }
    } else {
      checkEnd(run);
      if (run.status !== 'play') this.finish();
    }
    tick(run, dt);
  }

  drillDir() {
    if (isDown(this.inputMap, 'down')) return 'down';
    if (isDown(this.inputMap, 'left') && !isDown(this.inputMap, 'right')) return 'left';
    if (isDown(this.inputMap, 'right') && !isDown(this.inputMap, 'left')) return 'right';
    return null;
  }

  cellOfRig() {
    return {
      x: Math.max(0, Math.min(this.mine.w - 1, Math.floor(this.rig.position.x / 32))),
      y: Math.max(0, Math.min(this.mine.h - 1, Math.floor(this.rig.position.y / 32))),
    };
  }

  drillTarget(dir) {
    const c = this.cellOfRig();
    let tx = c.x;
    let ty = c.y;
    if (dir === 'down') ty += 1;
    else if (dir === 'left') tx -= 1;
    else if (dir === 'right') tx += 1;
    if (tx < 0 || ty < 0 || tx >= this.mine.w || ty >= this.mine.h) return null;
    const tile = this.mine.get(tx, ty);
    const info = TILE_INFO[tile];
    const sleeping = this.sleepingCells.has(`${tx},${ty}`);
    if (!info.solid && !sleeping) return null;
    if (Math.abs(tx - c.x) + Math.abs(ty - c.y) !== 1) return null;
    return { tx, ty, tile, info, sleeping };
  }

  gasArmed(target) {
    return this.hazards.gas.some((g) => g.x === target.tx && g.y === target.ty);
  }

  advanceDrill(dt, dir, target) {
    this.drillActive = false;
    if (!dir || !target) {
      this.drill = tickDrill(this.drill, null, dt, 1, false);
      return;
    }
    if (this.gasArmed(target)) return;
    const allowed = target.sleeping || canDrillTile(target.info, this.run.rig);
    const base = (target.sleeping || target.tile === TILE.MEUBLE)
      ? TILE_INFO[stratumTile(target.ty)].hardness
      : target.info.hardness;
    const dur = drillTime(Number.isFinite(base) ? base : 999, this.run.rig);
    if (!allowed) {
      this.drill = tickDrill(this.drill, target, dt, dur, true, false);
      this.toast(target.info.needsBit2 ? 'Mèche II requise' : 'Roc-mère');
      return;
    }
    this.drillActive = true;
    this.drill = tickDrill(this.drill, target, dt, dur, true, true);
    if (this.drill.done) this.completeDrill(target, dir);
  }

  completeDrill(target, dir) {
    const { tx, ty, tile, sleeping } = target;
    onTileDrilled(this.run.rig);
    if (sleeping) {
      this.removeSleepingAt(tx, ty);
      afterDrill(this.collapse, this.mine, tx, ty);
      armGasNear(this.hazards, this.mine, tx, ty);
      this.rebuildChunkOf(tx, ty);
    } else if (tile === TILE.GAZ) {
      armGasCell(this.hazards, tx, ty);
    } else {
      if (isOre(tile)) this.spawnOre(TILE_INFO[tile].value, tx, ty);
      if (tile === TILE.COEUR) {
        pickHeart(this.run.rig);
        this.toast('Cœur boréal à bord');
      }
      this.mine.set(tx, ty, TILE.VIDE);
      afterDrill(this.collapse, this.mine, tx, ty);
      armGasNear(this.hazards, this.mine, tx, ty);
      this.rebuildChunkOf(tx, ty);
    }
    if (dir === 'down') this.note({ type: 'forer', dir: 'down' });
    else this.note({ type: 'forer', dir });
  }

  resolveWarnings(dt) {
    const fell = advanceWarnings(this.collapse, this.mine, dt);
    for (const cell of fell) {
      this.rebuildChunkOf(cell.x, cell.y);
      this.spawnBlock(cell.x, cell.y);
    }
  }

  resolveGasDt(dt) {
    const blown = advanceGas(this.hazards, this.mine, dt);
    const c = this.cellOfRig();
    for (const g of blown) {
      afterDrill(this.collapse, this.mine, g.x, g.y);
      this.rebuildChunkOf(g.x, g.y);
      if (inBlast(c.x, c.y, g.x, g.y)) {
        damage(this.run.rig, CFG.GAS_DMG);
        this.toast('Explosion de gaz : 20 à la coque');
      }
    }
  }

  applyMotion(grounded, left, right) {
    const Body = matter().Body;
    const track = (CFG.TRACK_SPEED * CFG.TILE_PX / 60) * speedFactor(this.run.rig);
    const thrust = CFG.THRUST_SPEED * CFG.TILE_PX / 60;
    let vx = 0;
    if (left && !right) vx = -track;
    else if (right && !left) vx = track;
    if (!grounded && !this.thrusting) {
      this.rig.ignoreGravity = false;
      const vy = Body.getVelocity(this.rig).y;
      Body.setVelocity(this.rig, { x: 0, y: vy });
      return;
    }
    this.rig.ignoreGravity = true;
    if (this.thrusting) Body.setVelocity(this.rig, { x: vx, y: -thrust });
    else Body.setVelocity(this.rig, { x: grounded ? vx : 0, y: 0 });
  }

  alignTo(dir, target) {
    const Body = matter().Body;
    const p = this.rig.position;
    if (dir === 'down') {
      const cx = target.tx * 32 + 16;
      const nx = p.x + Math.sign(cx - p.x) * Math.min(1.6, Math.abs(cx - p.x));
      Body.setPosition(this.rig, { x: nx, y: p.y });
      const v = Body.getVelocity(this.rig);
      Body.setVelocity(this.rig, { x: 0, y: v.y });
    } else {
      const cy = target.ty * 32 + 16;
      const ny = p.y + Math.sign(cy - p.y) * Math.min(1.6, Math.abs(cy - p.y));
      Body.setPosition(this.rig, { x: p.x, y: ny });
      Body.setVelocity(this.rig, { x: dir === 'left' ? -0.45 : 0.45, y: 0 });
    }
  }

  capSpeeds() {
    const Body = matter().Body;
    const max = (CFG.MAX_BODY_SPEED * CFG.TILE_PX) / 60;
    const bodies = this.matter.world.localWorld?.bodies || [];
    this.maxBodies = Math.max(this.maxBodies, bodies.length);
    for (const b of bodies) {
      if (!Number.isFinite(b.position.x) || !Number.isFinite(b.position.y)) {
        this.bad += 1;
        continue;
      }
      if (b.isStatic) continue;
      const s = Math.hypot(b.velocity.x, b.velocity.y);
      if (s > max) Body.setVelocity(b, { x: (b.velocity.x / s) * max, y: (b.velocity.y / s) * max });
    }
  }

  clampRig() {
    const Body = matter().Body;
    const m = this.mine;
    let x = this.rig.position.x;
    let y = this.rig.position.y;
    const minX = 32 + 14;
    const maxX = (m.w - 1) * 32 - 14;
    const maxY = (m.h - 1) * 32 - 16;
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(16, Math.min(maxY, y));
    if (x !== this.rig.position.x || y !== this.rig.position.y) {
      Body.setPosition(this.rig, { x, y });
    }
  }

  isGrounded() {
    if (!this.rig) return false;
    const feet = this.rig.position.y + 14;
    for (const sx of [this.rig.position.x - 9, this.rig.position.x, this.rig.position.x + 9]) {
      const tx = Math.floor(sx / 32);
      const ty = Math.floor((feet + 4) / 32);
      if (this.solidAt(tx, ty)) return true;
    }
    return false;
  }

  solidAt(tx, ty) {
    if (!this.mine) return true;
    if (tx < 0 || ty < 0 || tx >= this.mine.w || ty >= this.mine.h) return true;
    if (TILE_INFO[this.mine.get(tx, ty)].solid) return true;
    return this.sleepingCells.has(`${tx},${ty}`);
  }

  updateHeat(dt) {
    const row = Math.floor(this.rig.position.y / 32);
    const heat = heatTick(this.hazards, this.run.rig, row, dt);
    this.inHeat = row > CFG.HEAT_ROW && !this.run.rig.upgrades.has('isolation');
    if (heat.entered) this.toast('Zone de chaleur');
    if (heat.dmg) damage(this.run.rig, heat.dmg);
  }

  updateFall(grounded) {
    if (this.thrusting) {
      this.fallFrom = null;
      return;
    }
    if (!grounded) {
      if (this.fallFrom == null) this.fallFrom = this.rig.position.y;
      return;
    }
    if (this.fallFrom == null) return;
    const tiles = (this.rig.position.y - this.fallFrom) / 32;
    const dmg = Math.round(fallDamage(tiles));
    this.fallFrom = null;
    if (dmg > 0) {
      damage(this.run.rig, dmg);
      this.toast(`Chute : ${dmg} à la coque`);
    }
  }

  updatePad() {
    const c = this.cellOfRig();
    const onSurface = Math.abs(c.x - this.mine.shaftX) <= 2 && c.y === 0 && this.isGrounded();
    if (onSurface) {
      const sold = arriveAtPad(this.run);
      if (sold > 0) {
        this.toast(`Vente : ${sold} crédits`);
        this.note({ type: 'vente' });
      }
      if (this.run.status === 'won') this.finish();
    } else if (this.run.onPad) leavePad(this.run);
  }

  updateReveal() {
    const c = this.cellOfRig();
    if (!this.lastCell || c.x !== this.lastCell.x || c.y !== this.lastCell.y) {
      reveal(this.knowledge, this.mine, c.x, c.y);
      this.dirtyAround(c.x, c.y, CFG.REVEAL_RADIUS);
      this.lastCell = { ...c };
    }
  }

  watchDangers() {
    this.watchGroup(this.collapse.warnings, 'bloc');
    this.watchGroup(this.collapse.queue, 'bloc');
    this.watchGroup(this.hazards.gas, 'gas');
  }

  watchGroup(items, kind) {
    const c = this.cellOfRig();
    for (const it of items) {
      const key = `${kind}:${it.x},${it.y}`;
      const dist = Math.abs(c.x - it.x) + Math.abs(c.y - it.y);
      if (!this.watches.has(key)) this.watches.set(key, dist);
      if (dist >= this.watches.get(key) + 1) {
        this.note({ type: kind === 'gas' ? 'gazEvite' : 'blocEvite' });
      }
    }
  }

  updateBlocks(dt) {
    const Body = matter().Body;
    for (const block of [...this.collapse.blocks]) {
      const body = this.blockBodies.get(block.id);
      if (!body) continue;
      if (block.state !== 'falling') continue;
      block.ageS += dt;
      const sp = Math.hypot(body.velocity.x, body.velocity.y);
      block.restS = sp < 0.18 ? block.restS + dt : 0;
      if (block.restS < CFG.SETTLE_S && block.ageS < CFG.SETTLE_MAX_S) continue;
      const cell = {
        x: Math.max(0, Math.min(this.mine.w - 1, Math.floor(body.position.x / 32))),
        y: Math.max(0, Math.min(this.mine.h - 1, Math.floor(body.position.y / 32))),
      };
      const result = trySettle(this.collapse, this.mine, block, cell, (x, y) => this.occupied(x, y), this.cellOfRig());
      if (result === 'sleeping') {
        Body.setStatic(body, true);
        Body.setVelocity(body, { x: 0, y: 0 });
        this.sleepingCells.add(`${cell.x},${cell.y}`);
        block.cell = cell;
      } else {
        this.matter.world.remove(body);
        this.blockBodies.delete(block.id);
        this.rebuildChunkOf(cell.x, cell.y);
      }
    }
  }

  occupied(x, y) {
    if (this.rigOverlaps(x, y)) return true;
    for (const n of this.pickups.dynamic) {
      const b = this.nuggetBodies.get(n.id);
      if (!b) continue;
      if (Math.floor(b.position.x / 32) === x && Math.floor(b.position.y / 32) === y) return true;
    }
    for (const n of this.pickups.static) {
      const px = n.px ?? n.x * 32 + 16;
      const py = n.py ?? n.y * 32 + 16;
      if (Math.floor(px / 32) === x && Math.floor(py / 32) === y) return true;
    }
    return false;
  }

  rigOverlaps(tx, ty) {
    const b = this.rig.bounds;
    const x0 = tx * 32;
    const y0 = ty * 32;
    return b.max.x > x0 + 1 && b.min.x < x0 + 31 && b.max.y > y0 + 1 && b.min.y < y0 + 31;
  }

  updateNuggets(dt) {
    for (const n of [...this.pickups.dynamic]) {
      const b = this.nuggetBodies.get(n.id);
      if (!b) continue;
      n.px = b.position.x;
      n.py = b.position.y;
      n.x = Math.floor(b.position.x / 32);
      n.y = Math.floor(b.position.y / 32);
      const sp = Math.hypot(b.velocity.x, b.velocity.y);
      restTick(this.pickups, n.id, sp < 0.12, dt);
      if (!this.pickups.dynamic.includes(n)) {
        this.matter.world.remove(b);
        this.nuggetBodies.delete(n.id);
      }
    }
    const grab = (n, px, py) => {
      const dx = px - this.rig.position.x;
      const dy = py - this.rig.position.y;
      if (dx * dx + dy * dy > 24 * 24) return;
      if (!pickNugget(this.run.rig, n.value)) {
        this.toast('Soute pleine');
        return;
      }
      collect(this.pickups, n.id);
      const b = this.nuggetBodies.get(n.id);
      if (b) {
        this.matter.world.remove(b);
        this.nuggetBodies.delete(n.id);
      }
      this.note({ type: 'ramasser' });
    };
    for (const n of [...this.pickups.dynamic]) {
      const b = this.nuggetBodies.get(n.id);
      if (b) grab(n, b.position.x, b.position.y);
    }
    for (const n of [...this.pickups.static]) grab(n, n.px ?? n.x * 32 + 16, n.py ?? n.y * 32 + 16);
  }

  spawnOre(value, tx, ty) {
    const n = spawnNugget(this.pickups, value, tx, ty);
    this.reapNuggetBodies();
    if (!this.pickups.dynamic.includes(n)) {
      n.px = tx * 32 + 16;
      n.py = ty * 32 + 16;
      return;
    }
    const body = this.matter.add.circle(tx * 32 + 16, ty * 32 + 16, 7, {
      label: 'nugget',
      friction: 0.2,
      frictionAir: 0.02,
      restitution: 0.05,
      density: 0.001,
      collisionFilter: { category: CAT.NUGGET, mask: CAT.SOLID | CAT.BLOCK },
    });
    body.plugin.nid = n.id;
    this.nuggetBodies.set(n.id, body);
    n.px = body.position.x;
    n.py = body.position.y;
  }

  reapNuggetBodies() {
    for (const [id, body] of this.nuggetBodies) {
      if (this.pickups.dynamic.some((n) => n.id === id)) continue;
      const n = this.pickups.static.find((s) => s.id === id);
      if (n) {
        n.px = body.position.x;
        n.py = body.position.y;
      }
      this.matter.world.remove(body);
      this.nuggetBodies.delete(id);
    }
  }

  spawnBlock(tx, ty) {
    const block = [...this.collapse.blocks].reverse().find((b) => b.x === tx && b.y === ty && !this.blockBodies.has(b.id));
    if (!block) return;
    const body = this.matter.add.rectangle(tx * 32 + 16, ty * 32 + 16, 26, 26, {
      label: 'block',
      friction: 0.35,
      frictionAir: 0.001,
      restitution: 0.02,
      density: 0.004,
      chamfer: { radius: 3 },
      collisionFilter: { category: CAT.BLOCK, mask: CAT.SOLID | CAT.NUGGET | CAT.BLOCK },
    });
    matter().Body.setInertia(body, Infinity);
    body.plugin.bid = block.id;
    this.blockBodies.set(block.id, body);
  }

  removeSleepingAt(tx, ty) {
    const key = `${tx},${ty}`;
    this.sleepingCells.delete(key);
    for (const [id, body] of this.blockBodies) {
      const bx = Math.floor(body.position.x / 32);
      const by = Math.floor(body.position.y / 32);
      if (bx === tx && by === ty) {
        this.matter.world.remove(body);
        this.blockBodies.delete(id);
        removeBlock(this.collapse, id);
      }
    }
  }

  onHit(ev) {
    if (!this.run || this.run.status !== 'play' || this.debug === 'collapse') return;
    for (const pair of ev.pairs) {
      const blockBody = pair.bodyA.label === 'block' ? pair.bodyA : (pair.bodyB.label === 'block' ? pair.bodyB : null);
      const rigBody = pair.bodyA.label === 'rig' ? pair.bodyA : (pair.bodyB.label === 'rig' ? pair.bodyB : null);
      if (!blockBody || !rigBody) continue;
      const id = blockBody.plugin.bid;
      if ((this.hitCooldown.get(id) || 0) > this.simTime) continue;
      const rv = Math.hypot(blockBody.velocity.x - rigBody.velocity.x, blockBody.velocity.y - rigBody.velocity.y);
      const dmg = impactDamage((rv * 60) / CFG.TILE_PX);
      if (dmg <= 0) continue;
      damage(this.run.rig, dmg);
      this.hitCooldown.set(id, this.simTime + 0.6);
      this.toast('Roche : 15 à la coque');
    }
  }

  carveChimney() {
    this.chimney = Math.min(this.mine.w - 2, Math.max(1, this.mine.shaftX + 6));
    for (let y = 1; y < this.mine.h - 1; y++) this.mine.set(this.chimney, y, TILE.VIDE);
    this.rebuildColumn(this.chimney);
  }

  spawnDebugWave() {
    this.clearBlocks();
    if (this.chimney == null) this.carveChimney();
    for (let y = 1; y < this.mine.h - 1; y++) this.mine.set(this.chimney, y, TILE.VIDE);
    this.rebuildColumn(this.chimney);
    for (let i = 0; i < CFG.MAX_BLOCKS; i++) {
      const block = { id: this.collapse.nextId++, x: this.chimney, y: 2, state: 'falling', restS: 0, ageS: 0 };
      this.collapse.blocks.push(block);
      const body = this.matter.add.rectangle(this.chimney * 32 + 16, 70 + i * 34, 26, 26, {
        label: 'block',
        friction: 0.3,
        frictionAir: 0.001,
        restitution: 0.05,
        density: 0.004,
        chamfer: { radius: 3 },
        collisionFilter: { category: CAT.BLOCK, mask: CAT.SOLID | CAT.NUGGET | CAT.BLOCK },
      });
      matter().Body.setInertia(body, Infinity);
      body.plugin.bid = block.id;
      this.blockBodies.set(block.id, body);
    }
  }

  clearBlocks() {
    for (const body of this.blockBodies.values()) this.matter.world.remove(body);
    this.blockBodies.clear();
    this.collapse.blocks = [];
    this.sleepingCells.clear();
  }

  rebuildAll() {
    const cols = Math.ceil(this.mine.w / CHUNK);
    const rows = Math.ceil(this.mine.h / CHUNK);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) this.rebuildChunk(cx, cy);
    }
  }

  rebuildChunkOf(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.mine.w || ty >= this.mine.h) return;
    this.rebuildChunk(Math.floor(tx / CHUNK), Math.floor(ty / CHUNK));
  }

  rebuildColumn(tx) {
    for (let y = 0; y < this.mine.h; y += CHUNK) this.rebuildChunkOf(tx, y);
  }

  dirtyAround(cx, cy, r) {
    const x0 = Math.floor((cx - r) / CHUNK);
    const x1 = Math.floor((cx + r) / CHUNK);
    const y0 = Math.floor((cy - r) / CHUNK);
    const y1 = Math.floor((cy + r) / CHUNK);
    for (let cy0 = y0; cy0 <= y1; cy0++) {
      for (let cx0 = x0; cx0 <= x1; cx0++) {
        if (cx0 < 0 || cy0 < 0) continue;
        this.rebuildChunk(cx0, cy0);
      }
    }
  }

  rebuildChunk(cx, cy) {
    const m = this.mine;
    const x0 = cx * CHUNK;
    const y0 = cy * CHUNK;
    if (x0 >= m.w || y0 >= m.h) return;
    const x1 = Math.min(m.w, x0 + CHUNK);
    const y1 = Math.min(m.h, y0 + CHUNK);
    const key = `${cx},${cy}`;
    for (const b of this.chunkBodies.get(key) || []) this.matter.world.remove(b);
    const bodies = [];
    let g = this.chunkGfx.get(key);
    if (!g) {
      g = this.add.graphics().setDepth(0);
      g.setPosition(x0 * 32, y0 * 32);
      this.chunkGfx.set(key, g);
    }
    g.clear();
    for (let y = y0; y < y1; y++) {
      const flags = [];
      for (let x = x0; x < x1; x++) {
        const tile = m.get(x, y);
        const known = this.knowledge[m.idx(x, y)] === 1;
        const look = appearance(tile, y, known);
        const lx = (x - x0) * 32;
        const ly = (y - y0) * 32;
        if (tile !== TILE.VIDE) {
          g.fillStyle(look.color, 1);
          g.fillRect(lx, ly, 32, 32);
        }
        if (look.cracks) {
          g.lineStyle(2, 0x2a2118, 0.95);
          g.beginPath();
          g.moveTo(lx + 6, ly + 8);
          g.lineTo(lx + 16, ly + 22);
          g.lineTo(lx + 26, ly + 12);
          g.moveTo(lx + 8, ly + 26);
          g.lineTo(lx + 22, ly + 16);
          g.strokePath();
        }
        if (look.hatch) {
          g.lineStyle(2, 0xb7c0cc, 0.8);
          g.lineBetween(lx + 4, ly + 28, lx + 28, ly + 4);
          g.lineBetween(lx + 4, ly + 16, lx + 18, ly + 4);
          g.lineBetween(lx + 14, ly + 28, lx + 28, ly + 14);
        }
        if (look.bubbles) {
          g.fillStyle(0xd9fff6, 0.9);
          g.fillCircle(lx + 10, ly + 20, 3);
          g.fillCircle(lx + 20, ly + 12, 4);
        }
        if (look.heart) {
          g.fillStyle(0xffd0d8, 1);
          g.fillCircle(lx + 16, ly + 16, 8);
          g.fillStyle(0xff4d6a, 1);
          g.fillCircle(lx + 16, ly + 16, 4);
        } else if (look.ore) {
          g.lineStyle(2, 0xf3efe4, 0.85);
          g.strokeRect(lx + 8, ly + 8, 16, 16);
        }
        flags.push(TILE_INFO[tile].solid ? 1 : 0);
      }
      for (const run of mergeRow(flags)) {
        const rw = run.w * 32 - 1;
        const rh = 31;
        const wx = (x0 + run.x) * 32 + (run.w * 32) / 2;
        const wy = y * 32 + 16;
        const body = this.matter.add.rectangle(wx, wy, rw, rh, {
          isStatic: true,
          label: 'terrain',
          friction: 0.9,
          restitution: 0,
          collisionFilter: { category: CAT.SOLID, mask: 0xFFFFFFFF },
        });
        bodies.push(body);
      }
    }
    this.chunkBodies.set(key, bodies);
  }

  drawDynamic() {
    if (!this.dyn || !this.rig) return;
    const g = this.dyn;
    g.clear();
    const shake = Math.sin(this.simTime * 42) * 2;
    const marks = [...this.collapse.warnings, ...this.collapse.queue];
    for (const w of marks) {
      g.fillStyle(0xe7a04a, 0.28);
      g.fillRect(w.x * 32 + shake, w.y * 32, 32, 32);
    }
    for (const gas of this.hazards?.gas || []) {
      const pulse = 8 + 6 * Math.min(1, gas.t / CFG.WARN_S);
      g.fillStyle(0xffb15a, 0.35);
      g.fillCircle(gas.x * 32 + 16, gas.y * 32 + 16, pulse);
    }
    for (const body of this.blockBodies.values()) {
      g.fillStyle(body.isStatic ? 0x8d7348 : 0xc49a62, 1);
      g.fillRect(body.position.x - 13, body.position.y - 13, 26, 26);
      g.lineStyle(2, 0x2a2118, 1);
      g.strokeRect(body.position.x - 13, body.position.y - 13, 26, 26);
    }
    const drawNugget = (n, px, py) => {
      g.fillStyle(nuggetColor(n.value), 1);
      g.fillCircle(px, py, 7);
      g.lineStyle(2, 0xf3efe4, 0.9);
      g.strokeCircle(px, py, 7);
    };
    for (const n of this.pickups?.dynamic || []) {
      const b = this.nuggetBodies.get(n.id);
      if (b) drawNugget(n, b.position.x, b.position.y);
    }
    for (const n of this.pickups?.static || []) drawNugget(n, n.px ?? n.x * 32 + 16, n.py ?? n.y * 32 + 16);
    const x = this.rig.position.x;
    const y = this.rig.position.y;
    g.fillStyle(0xc46a2c, 1);
    g.fillRoundedRect(x - 14, y - 14, 28, 28, 4);
    g.fillStyle(0x241c16, 1);
    g.fillRect(x - 12, y + 4, 24, 8);
    g.fillStyle(0xf6f1e8, 1);
    g.fillRect(x - 6, y - 8, 12, 7);
    if (this.thrusting) {
      g.fillStyle(0xffb15a, 0.95);
      g.fillTriangle(x - 6, y + 14, x + 6, y + 14, x, y + 24);
    }
  }

  trackFps(delta) {
    if (!delta) return;
    this.fps = Math.round(1000 / delta);
    this.fpsWarm += delta;
    if (this.fpsWarm > 1500 && this.fps < this.minFps && this.fps > 0) this.minFps = this.fps;
  }

  currentMode() {
    if (!this.run) return 'menu';
    if (this.trainCelebrated) return 'train-done';
    if (this.run.status !== 'play') return 'end';
    if (this.towAsk) return 'tow';
    if (this.run.workshopOpen) return 'workshop';
    if (this.mapOpen) return 'map';
    if (this.run.paused) return 'pause';
    return 'play';
  }

  pushView() {
    const hud = bridge.hud;
    const mode = this.currentMode();
    const run = this.run;
    const cell = this.rig ? this.cellOfRig() : { x: 0, y: 0 };
    const depth = run && this.rig ? Math.max(0, cell.y) : 0;
    const reserve = returnReserve(depth);
    const toast = this.setupOnly
      ? 'Mise en place du bouton seulement. Ce n’est pas une partie jouée.'
      : (this.simTime < this.toastUntil ? this.toastText : '');
    const hint = run && !run.tutorial && run.playedS < 14 && mode === 'play'
      ? 'Maintiens pour forer. Échap met en pause : la carte connue t’attend.'
      : '';
    const tutorialText = run?.tutorial && !this.trainCelebrated && this.tut.i < TUTORIAL_STEPS.length
      ? TUTORIAL_STEPS[this.tut.i].texte
      : '';
    const view = {
      mode,
      urlSeed: seedFromUrl(location.search),
      best: this.prefs?.best || 0,
      music: this.prefs?.music !== false,
      fuel: run?.rig.fuel ?? 0,
      fuelMax: run?.rig.fuelMax ?? CFG.FUEL_MAX,
      hull: run?.rig.hull ?? 0,
      hullMax: run?.rig.hullMax ?? CFG.HULL_MAX,
      cargo: run?.rig.cargo.length ?? 0,
      cargoMax: run?.rig.cargoMax ?? CFG.CARGO_MAX,
      heart: !!run?.rig.heart,
      credits: run?.credits ?? CFG.START_CREDITS,
      depth,
      reserve,
      playedS: run?.playedS ?? 0,
      message: toast || hint,
      tutorialText,
      onPad: !!run?.onPad,
      rescue: run ? canRescue(run) : false,
      rescueUsed: !!run?.rescueUsed,
      heat: !!this.inHeat && mode === 'play',
      upgrades: run ? [...run.rig.upgrades] : [],
      seed: run?.seed ?? 0,
      status: run?.status ?? 'menu',
      cause: run?.cause || '',
      score: run ? score(run) : 0,
      mine: this.mine,
      knowledge: this.knowledge,
      cellX: cell.x,
      cellY: cell.y,
    };
    hud?.sync(view);
    const bodies = this.matter?.world?.localWorld?.bodies?.length ?? 0;
    globalThis.__FB = {
      ready: true,
      mode,
      seed: run?.seed ?? null,
      fuel: run?.rig.fuel ?? null,
      hull: run?.rig.hull ?? null,
      cargo: run?.rig.cargo.length ?? 0,
      credits: run?.credits ?? null,
      depth,
      status: run?.status ?? 'menu',
      paused: !!run?.paused,
      workshop: !!run?.workshopOpen,
      bodies,
      blocks: this.collapse?.blocks.length ?? 0,
      nuggets: (this.pickups?.dynamic.length || 0) + (this.pickups?.static.length || 0),
      warnings: (this.collapse?.warnings.length || 0) + (this.collapse?.queue.length || 0),
      fps: this.fps,
      minFps: this.minFps === 999 ? null : this.minFps,
      maxBodies: this.maxBodies,
      bad: this.bad,
      steps: this.steps,
      elapsed: this.debug === 'collapse' ? this.debugElapsed : (run?.playedS ?? 0),
      onPad: !!run?.onPad,
      heart: !!run?.rig.heart,
      sold: run?.sold ?? 0,
      rescue: !!view.rescue,
      rescueUsed: !!view.rescueUsed,
      setupOnly: !!this.setupOnly,
      message: view.message,
      tutorial: run?.tutorial ? this.tut.i : null,
      cellX: cell.x,
      cellY: cell.y,
      rigY: this.rig ? this.rig.position.y : null,
    };
  }

  toast(text) {
    this.toastText = text;
    this.toastUntil = this.simTime + 2.6;
  }

  note(e) {
    if (!this.run?.tutorial || this.trainCelebrated) return;
    const next = advanceTutorial(this.tut, e);
    if (next !== this.tut) this.tut = next;
    if (this.tut.i >= TUTORIAL_STEPS.length) this.completeTraining();
  }

  completeTraining() {
    if (this.trainCelebrated) return;
    this.trainCelebrated = true;
    this.prefs.tutorialDone = true;
    savePrefs(localStorage, this.prefs);
    this.run.paused = true;
    this.stepper?.reset();
    releaseAll(this.inputMap);
  }

  zeroRig() {
    if (!this.rig) return;
    matter().Body.setVelocity(this.rig, { x: 0, y: 0 });
  }

  startGame(tutorial) {
    this.audio?.onGesture();
    if (tutorial) {
      this.game.scene.start('mine', { seed: TUTORIAL_SEED, tutorial: true });
      return;
    }
    let seed = seedFromUrl(location.search);
    if (seed == null) seed = randomSeed();
    history.replaceState(null, '', urlForSeed(seed));
    this.game.scene.start('mine', { seed, tutorial: false });
  }

  toggleSound() {
    this.audio?.onGesture();
    this.prefs.music = !this.prefs.music;
    savePrefs(localStorage, this.prefs);
    this.audio.prefs = this.prefs;
    this.audio.apply();
    this.pushView();
  }

  togglePause() {
    if (!this.run || this.finished || this.trainCelebrated) return;
    if (this.run.status !== 'play') return;
    if (this.towAsk) {
      this.towAsk = false;
      return;
    }
    if (this.mapOpen) {
      this.mapOpen = false;
      return;
    }
    if (this.run.workshopOpen) {
      this.closeWorkshop();
      return;
    }
    if (this.run.paused) this.resume();
    else this.pauseRun();
  }

  pauseRun() {
    this.run.paused = true;
    this.stepper?.reset();
    releaseAll(this.inputMap);
    this.zeroRig();
    this.pushView();
  }

  resume() {
    if (!this.run) return;
    this.run.paused = false;
    this.mapOpen = false;
    this.towAsk = false;
    this.stepper?.reset();
    this.pushView();
  }

  openMap() {
    if (!this.run) return;
    this.run.paused = true;
    this.mapOpen = true;
    this.stepper?.reset();
    releaseAll(this.inputMap);
    this.zeroRig();
    this.pushView();
  }

  closeMap() {
    this.mapOpen = false;
    this.pushView();
  }

  openWorkshop() {
    if (!this.run?.onPad || this.run.status !== 'play' || this.trainCelebrated) return;
    this.run.workshopOpen = true;
    this.stepper?.reset();
    releaseAll(this.inputMap);
    this.zeroRig();
    this.pushView();
  }

  closeWorkshop() {
    if (!this.run) return;
    this.run.workshopOpen = false;
    this.stepper?.reset();
    this.pushView();
  }

  doRescue() {
    if (!this.run) return;
    const n = rescue(this.run);
    this.toast(n > 0 ? `Dépannage : carburant à 40. Une seule fois.` : 'Dépannage indisponible');
    this.pushView();
  }

  doRefuel() {
    if (!this.run) return;
    const n = refuel(this.run);
    this.toast(n > 0 ? `Plein : ${n} unité${n > 1 ? 's' : ''}` : 'Rien à remplir');
    this.pushView();
  }

  doRepair() {
    if (!this.run) return;
    const n = repair(this.run);
    this.toast(n > 0 ? `Réparation : ${n} point${n > 1 ? 's' : ''}` : 'Coque déjà pleine');
    this.pushView();
  }

  doBuy(id) {
    if (!this.run) return;
    if (!buy(this.run, id)) this.toast('Achat impossible');
    else this.toast('Amélioration en place');
    this.pushView();
  }

  askTow() {
    if (!this.run || this.cellOfRig().y <= 0) return;
    this.towAsk = true;
    this.run.paused = true;
    this.pushView();
  }

  cancelTow() {
    this.towAsk = false;
    this.pushView();
  }

  confirmTow() {
    if (!this.run) return;
    const had = this.run.rig.heart;
    const hx = this.mine.heart?.x ?? 0;
    const hy = this.mine.heart?.y ?? 0;
    if (this.run.credits < CFG.TOW_COST) this.run.cause = 'tow';
    tow(this.run);
    this.towAsk = false;
    if (this.run.status !== 'play') {
      this.finish();
      return;
    }
    if (had && !(hx === 0 && hy === 0)) {
      this.removeSleepingAt(hx, hy);
      this.mine.set(hx, hy, TILE.COEUR);
      this.rebuildChunkOf(hx, hy);
    }
    const x = this.mine.shaftX * 32 + 16;
    matter().Body.setPosition(this.rig, { x, y: 18 });
    matter().Body.setVelocity(this.rig, { x: 0, y: 0 });
    this.fallFrom = null;
    this.run.paused = false;
    this.toast('Remorqué au Poste. La soute est vide.');
    this.pushView();
  }

  abandon() {
    if (!this.run || this.run.status !== 'play') return;
    abandon(this.run);
    this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.run.paused = true;
    this.towAsk = false;
    this.mapOpen = false;
    this.run.workshopOpen = false;
    this.stepper?.reset();
    releaseAll(this.inputMap);
    this.zeroRig();
    if (!this.run.tutorial) {
      recordScore(this.prefs, this.run, score(this.run));
      savePrefs(localStorage, this.prefs);
    }
    this.pushView();
  }

  replay() {
    const seed = this.run.seed;
    history.replaceState(null, '', urlForSeed(seed));
    this.game.scene.start('mine', { seed, tutorial: false });
  }

  newMine() {
    const seed = randomSeed();
    history.replaceState(null, '', urlForSeed(seed));
    this.game.scene.start('mine', { seed, tutorial: false });
  }

  goMenu() {
    this.game.scene.start('mine', { menu: true });
  }

  trySurvey() {
    if (!this.run || this.run.status !== 'play' || this.run.paused || this.run.workshopOpen) return;
    const v = matter().Body.getVelocity(this.rig);
    const still = !isDown(this.inputMap, 'left') && !isDown(this.inputMap, 'right')
      && !isDown(this.inputMap, 'down') && !isDown(this.inputMap, 'thrust')
      && Math.hypot(v.x, v.y) < 0.8;
    const c = this.cellOfRig();
    if (!still) {
      this.toast('Il faut être immobile pour sonder.');
      this.pushView();
      return;
    }
    if (!survey(this.knowledge, this.mine, this.run.rig, c.x, c.y, true)) {
      this.toast('Pas assez de carburant.');
      this.pushView();
      return;
    }
    for (let y = c.y; y <= Math.min(this.mine.h - 1, c.y + CFG.SURVEY_DEPTH); y++) this.rebuildChunkOf(c.x, y);
    this.toast('Sondage : 8 tuiles sous la foreuse.');
    this.pushView();
  }

  bindInput() {
    this.onKeyDown = (e) => {
      if (e.repeat) return;
      const action = KEYMAP[e.code];
      if (!action) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      this.audio?.onGesture();
      if (action === 'pause') {
        this.togglePause();
        return;
      }
      if (action === 'mute') {
        this.toggleSound();
        return;
      }
      if (action === 'survey') {
        this.trySurvey();
        return;
      }
      if (!this.run || this.currentMode() !== 'play') return;
      press(this.inputMap, action, 'key');
    };
    this.onKeyUp = (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      release(this.inputMap, action, 'key');
    };
    this.onBlur = () => {
      releaseAll(this.inputMap);
      if (this.run && this.run.status === 'play' && this.currentMode() === 'play') this.pauseRun();
    };
    this.onVis = () => {
      if (document.hidden) this.onBlur();
    };
    this.onGesture = () => this.audio?.onGesture();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVis);
    window.addEventListener('pointerdown', this.onGesture);
    this.events.once('shutdown', () => {
      this.detachInput();
      this.destroyMatter();
    });
  }

  detachInput() {
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    if (this.onBlur) window.removeEventListener('blur', this.onBlur);
    if (this.onVis) document.removeEventListener('visibilitychange', this.onVis);
    if (this.onGesture) window.removeEventListener('pointerdown', this.onGesture);
    if (this.onResize) this.scale?.off('resize', this.onResize);
    this.onKeyDown = null;
  }

  skipTraining() {
    if (!this.run?.tutorial) return;
    this.completeTraining();
    this.pushView();
  }

  destroyMatter() {
    if (this.onHitBound && this.matter?.world) this.matter.world.off('collisionstart', this.onHitBound);
    const world = this.matter?.world;
    const bodies = world?.localWorld?.bodies;
    if (!bodies) return;
    for (const b of bodies.slice()) world.remove(b);
  }
}
