export const KEYMAP = Object.freeze({
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyW: 'thrust',
  ArrowUp: 'thrust',
  Space: 'thrust',
  Escape: 'pause',
  KeyP: 'pause',
  KeyM: 'mute',
  KeyR: 'survey',
});

export const newInput = () => new Map();

export function press(i, action, src) {
  if (!i.has(action)) i.set(action, new Set());
  i.get(action).add(src);
}

export function release(i, action, src) {
  i.get(action)?.delete(src);
}

export const releaseAll = (i) => i.clear();

export const isDown = (i, action) => (i.get(action)?.size ?? 0) > 0;
