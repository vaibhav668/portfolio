// All island audio, synthesized with the Web Audio API (no audio files to load or license).
// Browsers only allow sound after a user gesture, so nothing plays until start() is
// called from a click or key press (Start exploration / Browse).

const STORE_KEY = 'island-sound-muted';
const readMuted = () => { try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; } };
const saveMuted = (m) => { try { localStorage.setItem(STORE_KEY, m ? '1' : '0'); } catch { /* storage blocked: keep in memory */ } };

const rand = (a, b) => a + Math.random() * (b - a);

class Sound {
  constructor() {
    this.ctx = null;
    this.muted = readMuted();
    this.started = false;
    this.listeners = new Set();
  }

  // ---------------------------------------------------------------- setup
  _init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    // gentle limiter so overlapping effects never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = this._bus(0.9);
    this.amb = this._bus(0.8);
    this.music = this._bus(0.55);
    // one second of white noise, reused by wind, steps and whooshes
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend(); else if (this.started) ctx.resume();
    });
    return true;
  }
  _bus(v) { const g = this.ctx.createGain(); g.gain.value = v; g.connect(this.master); return g; }

  /** Call from a user gesture. Starts the ambient bed once. */
  start() {
    if (!this._init()) return;
    this.ctx.resume();
    if (this.started) return;
    this.started = true;
    this._wind();
    this._birds();
    this._pad();
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running' && !this.muted; }

  setMuted(m) {
    this.muted = m;
    saveMuted(m);
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.08);
    this.listeners.forEach((f) => f(m));
  }
  toggle() { this.setMuted(!this.muted); if (!this.muted) { this.start(); this.click(); } }
  onChange(f) { this.listeners.add(f); f(this.muted); }

  // ---------------------------------------------------------------- building blocks
  _env(gain, t, attack, hold, release, peak) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.setValueAtTime(peak, t + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }
  _tone({ freq, to, type = 'sine', at = 0, dur = 0.15, vol = 0.1, bus = this.sfx, attack = 0.005, pan = 0 }) {
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    this._env(g, t, attack, 0, dur, vol);
    let out = g;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
    o.connect(g); out.connect(bus);
    o.start(t); o.stop(t + attack + dur + 0.05);
  }
  _noise({ at = 0, dur = 0.2, vol = 0.1, type = 'bandpass', freq = 800, to, q = 1, bus = this.sfx, attack = 0.005 }) {
    const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    this._env(g, t, attack, 0, dur, vol);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + attack + dur + 0.05);
  }

  // ---------------------------------------------------------------- ambience
  _wind() {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.7;
    const g = c.createGain(); g.gain.value = 0.05;
    // slow gusts: LFOs on filter cutoff and level
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lfoAmt = c.createGain(); lfoAmt.gain.value = 220;
    lfo.connect(lfoAmt).connect(f.frequency);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.045;
    const lfo2Amt = c.createGain(); lfo2Amt.gain.value = 0.025;
    lfo2.connect(lfo2Amt).connect(g.gain);
    s.connect(f).connect(g).connect(this.amb);
    s.start(); lfo.start(); lfo2.start();
  }
  _birds() {
    const chirp = () => {
      if (this.ready) {
        const base = rand(2400, 3600), notes = 2 + Math.floor(Math.random() * 4), pan = rand(-0.8, 0.8);
        for (let i = 0; i < notes; i++) {
          this._tone({ freq: base * rand(0.9, 1.15), to: base * rand(1.2, 1.6), at: i * rand(0.09, 0.14), dur: 0.07, vol: 0.022, bus: this.amb, pan });
        }
      }
      setTimeout(chirp, rand(3500, 9000));
    };
    setTimeout(chirp, 1500);
  }
  // Very quiet pad: four slow chords, soft triangle voices through a lowpass.
  _pad() {
    const c = this.ctx;
    const chords = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 392.0]];
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    f.connect(this.music);
    let k = 0;
    const play = () => {
      if (this.ready) {
        const t = c.currentTime, dur = 9;
        for (const hz of chords[k % chords.length]) {
          const o = c.createOscillator(), g = c.createGain();
          o.type = 'triangle'; o.frequency.value = hz / 2; o.detune.value = rand(-6, 6);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.012, t + 3);
          g.gain.linearRampToValueAtTime(0.0001, t + dur);
          o.connect(g).connect(f); o.start(t); o.stop(t + dur + 0.1);
        }
      }
      k++;
      setTimeout(play, 8000);
    };
    play();
  }

  // ---------------------------------------------------------------- effects
  step(speed = 1) {
    if (!this.ready) return;
    this._noise({ dur: 0.09, vol: 0.05 + 0.03 * speed, type: 'bandpass', freq: rand(380, 620), q: 1.4 });
    this._tone({ freq: rand(90, 120), to: 60, dur: 0.07, vol: 0.04 });
  }
  jump() { if (this.ready) this._tone({ freq: 260, to: 520, dur: 0.14, vol: 0.05, type: 'sine' }); }
  land() { if (this.ready) { this._noise({ dur: 0.14, vol: 0.09, freq: 300, q: 0.8 }); this._tone({ freq: 110, to: 55, dur: 0.12, vol: 0.07 }); } }
  click() { if (this.ready) this._tone({ freq: 1400, to: 1100, dur: 0.035, vol: 0.035, type: 'triangle' }); }
  open() { if (this.ready) { this._noise({ dur: 0.22, vol: 0.05, type: 'highpass', freq: 1200, to: 4000, q: 0.5 }); this._tone({ freq: 660, dur: 0.12, vol: 0.04, at: 0.05 }); } }
  close() { if (this.ready) this._noise({ dur: 0.18, vol: 0.04, type: 'highpass', freq: 3500, to: 1000, q: 0.5 }); }
  whoosh() { if (this.ready) this._noise({ dur: 0.5, vol: 0.07, type: 'bandpass', freq: 300, to: 2400, q: 0.9, attack: 0.12 }); }
  interact() { if (this.ready) { this._tone({ freq: 880, dur: 0.18, vol: 0.06 }); this._tone({ freq: 1320, dur: 0.25, vol: 0.05, at: 0.07 }); } }
  chime() { if (this.ready) [523.3, 659.3, 784.0].forEach((hz, i) => this._tone({ freq: hz, dur: 0.35, vol: 0.045, at: i * 0.08 })); }
  sparkle() { if (this.ready) [1046.5, 1318.5, 1568.0, 2093.0, 2637.0].forEach((hz, i) => this._tone({ freq: hz, dur: 0.3, vol: 0.035, at: i * 0.06, type: 'triangle' })); }
  fanfare() { if (this.ready) [392.0, 523.3, 659.3, 784.0, 1046.5].forEach((hz, i) => this._tone({ freq: hz, dur: i === 4 ? 0.8 : 0.22, vol: 0.06, at: i * 0.11, type: 'triangle' })); }
  // soft "voice" blip for the guide's typewriter text
  blip() { if (this.ready) this._tone({ freq: rand(420, 560), dur: 0.04, vol: 0.025, type: 'square' }); }
}

export const sound = new Sound();
