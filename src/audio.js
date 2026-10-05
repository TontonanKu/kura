// Audio synthesizer using Web Audio API (Zero external assets needed)

class SoundController {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this.soundVolume = 0.8;
    this.musicVolume = 0.4;
    this.bgmOscs = [];
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCardSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    
    // Quick snap / flip sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.08);

    gain.gain.setValueAtTime(this.soundVolume * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  playDrawSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    
    // Whoosh-like draw sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.1);

    gain.gain.setValueAtTime(this.soundVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  playShieldSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Metallic shield deflection clang + shimmer
    [520, 1040, 1560, 2080].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.4);

      gain.gain.setValueAtTime((this.soundVolume * 0.5) / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35 + idx * 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  playSwapSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Whimsical swap two-tone swirl
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.12);
    osc.frequency.linearRampToValueAtTime(280, t + 0.25);
    osc.frequency.linearRampToValueAtTime(550, t + 0.38);

    gain.gain.setValueAtTime(this.soundVolume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  playShellSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Heavy protective shell sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);

    gain.gain.setValueAtTime(this.soundVolume * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playWildSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Arpeggio chord
    [440, 554, 659, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(this.soundVolume * 0.4, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.32);
    });
  }

  playKuraSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Energetic cartoon chime
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);

      gain.gain.setValueAtTime(this.soundVolume * 0.3, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.28);
    });
  }

  playTurnSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Subtle gentle turn ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);

    gain.gain.setValueAtTime(this.soundVolume * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playWinSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Fanfare: C4, E4, G4, C5, E5, G5
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(this.soundVolume * 0.5, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.65);
    });
  }

  playLoseSound() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Sad descending notes
    const notes = [440, 415.3, 392, 349.2];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.2);

      gain.gain.setValueAtTime(this.soundVolume * 0.4, t + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.2 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.2);
      osc.stop(t + idx * 0.2 + 0.38);
    });
  }

  playClick() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(this.soundVolume * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Cozy Lo-Fi ambient background synthesizer
  startBGM() {
    if (!this.musicEnabled) return;
    this.init();
    if (this.bgmTimer) return;

    // Lofi chord progression: Dmaj7 -> Gmaj7 -> F#m7 -> Bm7
    const chords = [
      [293.66, 369.99, 440.00, 554.37], // Dmaj7
      [196.00, 246.94, 293.66, 369.99], // Gmaj7
      [185.00, 220.00, 277.18, 329.63], // F#m7
      [246.94, 293.66, 369.99, 440.00], // Bm7
    ];

    let chordIdx = 0;
    const playNextChord = () => {
      if (!this.musicEnabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = chords[chordIdx];
      chordIdx = (chordIdx + 1) % chords.length;

      notes.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(this.musicVolume * 0.08, t + 0.8);
        gain.gain.linearRampToValueAtTime(0.001, t + 3.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 4.0);
      });
    };

    playNextChord();
    this.bgmTimer = setInterval(playNextChord, 4000);
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setSoundEnabled(val) {
    this.soundEnabled = val;
  }

  setMusicEnabled(val) {
    this.musicEnabled = val;
    if (val) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
  }

  setSoundVolume(val) {
    this.soundVolume = val;
  }

  setMusicVolume(val) {
    this.musicVolume = val;
  }
}

export const sounds = new SoundController();
