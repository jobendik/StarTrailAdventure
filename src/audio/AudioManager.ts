import type { MusicMode } from '../types/game.ts';

type OscType = 'sine' | 'square' | 'sawtooth' | 'triangle';
type FreqPoint = [number, number]; // [freq, time]

const MUSIC_PATTERNS: Record<string, number[]> = {
  title:   [0,2,4,7,4,2,5,4],
  map0:    [0,2,4,2,5,4,2,1],
  map1:    [0,3,5,3,6,5,3,1],
  map2:    [0,2,5,7,5,2,7,5],
  map3:    [0,3,6,8,6,3,5,2],
  map4:    [0,1,3,1,4,3,1,0],
  stage0:  [0,4,2,5,4,2,1,2],
  stage1:  [0,3,5,6,5,3,2,3],
  stage2:  [0,4,7,5,7,4,2,4],
  stage3:  [0,3,7,8,7,3,5,3],
  stage4:  [0,1,4,3,4,1,0,-1],
  fortress:[0,0,3,1,0,4,3,1],
  victory: [0,2,4,7,9,7,11,12],
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicToken = 0;
  private _musicMode: MusicMode = 'none';
  private _muted = false;

  get musicMode() { return this._musicMode; }
  get muted() { return this._muted; }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  init(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private beep(type: OscType, freqs: number | FreqPoint[], vol = 0.08, dur = 0.16, pitchMul = 1): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.master);
    osc.type = type;
    if (Array.isArray(freqs)) {
      freqs.forEach(([f, at]) => osc.frequency.setValueAtTime(f * pitchMul, t + at));
    } else {
      osc.frequency.setValueAtTime(freqs * pitchMul, t);
    }
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Coin pickup with rising pitch as the combo chain grows. */
  playCoin(chain = 0): void {
    if (!this.ctx) return;
    const pitchMul = Math.pow(2, Math.min(chain, 12) / 12);
    this.beep('square', [[988, 0], [1318, .06]], .08, .15, pitchMul);
  }

  play(name: string): void {
    if (!this.ctx) return;
    switch (name) {
      case 'jump':    this.beep('square',   [[260,0],[620,.12]], .09, .18); break;
      case 'coin':    this.beep('square',   [[988,0],[1318,.06]], .08, .15); break;
      case 'stomp':   this.beep('triangle', [[520,0],[90,.11]], .12, .18); break;
      case 'pow':     this.beep('square',   [[523,0],[659,.08],[784,.16],[1047,.24]], .08, .38); break;
      case 'bump':    this.beep('triangle', [[180,0],[110,.08]], .09, .1); break;
      case 'dmg':     this.beep('sawtooth', [[420,0],[180,.16]], .1, .22); break;
      case 'die':     this.beep('square',   [[620,0],[240,.2],[90,.55]], .11, .72); break;
      case 'fire':    this.beep('sawtooth', [[780,0],[860,.03],[720,.07]], .06, .12); break;
      case 'bounce':  this.beep('square',   [[180,0],[700,.05],[1200,.11]], .1, .16); break;
      case 'crumble': this.beep('triangle', [[140,0],[70,.12]], .08, .18); break;
      case 'ckpt':    this.beep('square',   [[784,0],[988,.08],[1175,.16]], .08, .32); break;
      case 'secret':  this.beep('square',   [[660,0],[880,.05],[1175,.1],[1568,.18]], .09, .32); break;
      case 'unlock':  this.beep('square',   [[523,0],[659,.06],[784,.12],[988,.18]], .09, .34); break;
      case 'clear':   this.beep('square',   [[523,0],[587,.08],[659,.16],[784,.24],[988,.32],[1175,.4]], .09, .62); break;
      case 'world':   this.beep('square',   [[392,0],[523,.08],[659,.16],[784,.24],[1047,.32]], .1, .66); break;
      case 'victory': this.beep('square',   [[523,0],[659,.08],[784,.16],[1047,.24],[1318,.36],[1568,.48]], .1, .95); break;
    }
  }

  startMusic(mode: MusicMode, worldIndex = 0): void {
    if (!this.ctx || this._musicMode === mode) return;
    this._musicMode = mode;
    const token = ++this.musicToken;
    const roots = [262, 220, 294, 247, 196];
    const root  = roots[worldIndex] ?? 262;
    const pattern = (MUSIC_PATTERNS[mode] ?? MUSIC_PATTERNS['map0']!).slice();
    const tempo   = mode === 'title' ? 124 : mode === 'fortress' ? 138 : mode === 'victory' ? 150 : 128;
    const stepMs  = 60000 / tempo / 2;
    let step = 0;
    const tick = () => {
      if (token !== this.musicToken || !this.ctx || !this.master) return;
      const now   = this.ctx.currentTime;
      const note  = pattern[step % pattern.length]!;
      const freq  = root * Math.pow(2, note / 12);
      const bassNote = pattern[(step + 4) % pattern.length]! - 12;
      const bassFreq = root * Math.pow(2, bassNote / 12);
      const osc1 = this.ctx.createOscillator();
      const g1   = this.ctx.createGain();
      osc1.connect(g1); g1.connect(this.master);
      osc1.type = mode === 'fortress' ? 'triangle' : 'square';
      osc1.frequency.setValueAtTime(freq, now);
      g1.gain.setValueAtTime(0.032, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.start(now); osc1.stop(now + 0.2);
      if (step % 2 === 0) {
        const osc2 = this.ctx.createOscillator(); const g2 = this.ctx.createGain();
        osc2.connect(g2); g2.connect(this.master);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(bassFreq, now);
        g2.gain.setValueAtTime(0.016, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc2.start(now); osc2.stop(now + 0.24);
      }
      step++;
      setTimeout(tick, stepMs);
    };
    tick();
  }

  stopMusic(): void {
    this.musicToken++;
    this._musicMode = 'none';
  }
}
