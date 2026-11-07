export const audioPolicy = ({ musicPref, gestured, assetLoaded }) => (
  !musicPref || !assetLoaded ? 'silent' : (gestured ? 'play' : 'wait')
);

let gesturedOnce = false;
export const hasGesture = () => gesturedOnce;
export const markGesture = () => { gesturedOnce = true; };

/**
 * Musique optionnelle. Sans fichier dans le manifeste : silence.
 * Aucun son n'est synthétisé. Le démarrage attend le premier geste.
 */
export class Audio {
  constructor(scene, prefs) {
    this.scene = scene;
    this.prefs = prefs;
    this.music = null;
  }

  loaded() {
    try { return !!this.scene?.cache?.audio?.exists('musique'); } catch { return false; }
  }

  onGesture() {
    markGesture();
    this.apply();
  }

  apply() {
    const policy = audioPolicy({
      musicPref: !!this.prefs.music,
      gestured: hasGesture(),
      assetLoaded: this.loaded(),
    });
    if (policy === 'play') {
      if (!this.music) this.music = this.scene.sound.add('musique', { loop: true, volume: this.prefs.volume });
      this.music.setVolume(this.prefs.volume);
      if (!this.music.isPlaying) this.music.play();
    } else if (this.music && this.music.isPlaying) {
      this.music.stop();
    }
  }
}
