/**
 * FlexAlign AI - Auditory Telemetry & Spoken Coaching Engine
 * Web Audio API synthesizer chimes + Web Speech API synthesized coach.
 */

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.lastSpokenTime = 0;
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

  speakCoach(text, priority = false) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
    const now = Date.now();
    if (!priority && now - this.lastSpokenTime < 2400) return;
    this.lastSpokenTime = now;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 1.0;
      utter.volume = 0.9;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    return this.voiceEnabled;
  }
}
