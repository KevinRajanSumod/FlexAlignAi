/**
 * FlexAlign AI - Auditory Telemetry Engine
 * Web Audio API synthesizer chimes.
 */

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.12) {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  playRepSuccess() {
    // High crisp double chime (587.33Hz -> 880Hz)
    this.playTone(587.33, 'sine', 0.08, 0.15);
    setTimeout(() => this.playTone(880, 'sine', 0.2, 0.2), 90);
  }

  playSafeTargetTone() {
    // Gentle soft medical chime (523.25Hz)
    this.playTone(523.25, 'sine', 0.25, 0.12);
  }

  playFaultAlert() {
    // Caution buzz (190Hz triangle)
    this.playTone(190, 'triangle', 0.22, 0.22);
  }

  playCoachWakeChime() {
    // Futuristic sci-fi double ascending chime for 'Hey Coach' wake detection
    this.playTone(440, 'sine', 0.08, 0.16);
    setTimeout(() => this.playTone(659.25, 'sine', 0.22, 0.2), 85);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }
}
