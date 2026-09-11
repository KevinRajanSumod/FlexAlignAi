/**
 * FlexAlign AI - Unified Neural & Web Speech Voice Engine
 * High-fidelity voice synthesis with automatic zero-latency browser fallback,
 * natural voice regulation (cadence, pitch, speed, volume), markdown cleaning,
 * and instant barge-in / interrupt capabilities.
 */

export const PROFESSIONAL_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Clinical Pro - Neural)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Authoritative Coach)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Sports Specialist)' },
  { id: 'browser_natural_female', name: 'Ava / Samantha (Natural Female)' },
  { id: 'browser_natural_male', name: 'Guy / Daniel (Natural Male)' }
];

export class ElevenLabsVoice {
  constructor() {
    this.apiKey = 'sk_ead522be1d1ca34f01499de3e2ea56692914bc7db5566c48';
    this.voiceId = '21m00Tcm4TlvDq8ikWAM'; // Default Rachel
    this.modelId = 'eleven_turbo_v2_5';
    this.isEnabled = true;
    this.isSpeaking = false;
    this.currentAudio = null;

    // Voice Regulation Settings
    this.rate = 1.05;   // Ideal energetic coaching tempo (0.8 - 1.4)
    this.pitch = 1.0;  // Natural vocal pitch (0.8 - 1.2)
    this.volume = 1.0; // Audio volume (0.0 - 1.0)

    // Callbacks
    this.onStateChange = null;
    this.onSpeakingStart = null;
    this.onSpeakingEnd = null;

    // Pre-warm browser speech synthesis
    this._availableBrowserVoices = [];
    this._initBrowserVoices();
  }

  _initBrowserVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        this._availableBrowserVoices = window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  setVoice(voiceId) {
    if (this.isSpeaking) {
      this.stop();
    }
    this.voiceId = voiceId;
  }

  setRate(rate) {
    this.rate = Math.max(0.7, Math.min(1.5, Number(rate) || 1.05));
  }

  setPitch(pitch) {
    this.pitch = Math.max(0.7, Math.min(1.3, Number(pitch) || 1.0));
  }

  setVolume(volume) {
    this.volume = Math.max(0.0, Math.min(1.0, Number(volume) || 1.0));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  toggleVoice() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stop();
    }
    if (this.onStateChange) this.onStateChange(this.isEnabled, this.isSpeaking);
    return this.isEnabled;
  }

  /**
   * Instant barge-in / speech cancellation (<1ms)
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const wasSpeaking = this.isSpeaking;
    this.isSpeaking = false;

    if (this.onStateChange) this.onStateChange(this.isEnabled, false);
    if (wasSpeaking && this.onSpeakingEnd) this.onSpeakingEnd();
  }

  /**
   * Cleans text to ensure natural, pleasant phonetic pronunciation:
   * Strips emojis, asterisks, hashtags, urls, bullet points, technical brackets,
   * and expands degrees/percentages.
   */
  cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      // Replace degree symbols and percentages for clear pronunciation
      .replace(/(\d+)\s*°/g, '$1 degrees')
      .replace(/(\d+)\s*%/g, '$1 percent')
      // Remove markdown bold/italic/headers/quotes/code
      .replace(/[*#_`~>]/g, '')
      // Remove URLs
      .replace(/https?:\/\/\S+/g, '')
      // Remove bullets, dashes, technical symbols
      .replace(/^[•\-\*\+]\s+/gm, '')
      // Remove all emojis
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1FA00}-\u{1FAFF}]/gu, '')
      // Remove parenthetical meta-notes like (⚡ Biomechanical AI Coach)
      .replace(/\s*\([^)]*Coach[^)]*\)/gi, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  async speak(text, onFinished = null) {
    if (!this.isEnabled || !text) return;

    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) return;

    // Instant interruption of any previous speech
    this.stop();

    this.isSpeaking = true;
    if (this.onStateChange) this.onStateChange(this.isEnabled, true);
    if (this.onSpeakingStart) this.onSpeakingStart();

    // Check if user explicitly selected a browser voice
    const isBrowserVoice = this.voiceId && this.voiceId.startsWith('browser_');

    if (!isBrowserVoice && this.apiKey) {
      try {
        const played = await this._speakWithElevenLabs(cleanText, onFinished);
        if (played) return;
      } catch (err) {
        console.warn('[UnifiedVoiceEngine] ElevenLabs failed, falling back to Web Speech API:', err.message);
      }
    }

    // High-fidelity fallback using Web Speech API
    this._speakWithWebSpeech(cleanText, onFinished);
  }

  async _speakWithElevenLabs(cleanText, onFinished) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: this.modelId,
        voice_settings: {
          stability: 0.72,
          similarity_boost: 0.85,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.volume = this.volume;
    this.currentAudio = audio;

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        this.isSpeaking = false;
        this.currentAudio = null;
        if (this.onStateChange) this.onStateChange(this.isEnabled, false);
        if (this.onSpeakingEnd) this.onSpeakingEnd();
        if (typeof onFinished === 'function') onFinished();
        resolve(true);
      };

      audio.onerror = (e) => {
        this.isSpeaking = false;
        this.currentAudio = null;
        if (this.onStateChange) this.onStateChange(this.isEnabled, false);
        if (this.onSpeakingEnd) this.onSpeakingEnd();
        reject(e);
      };

      audio.play().catch(reject);
    });
  }

  _speakWithWebSpeech(cleanText, onFinished) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeaking = false;
      if (this.onStateChange) this.onStateChange(this.isEnabled, false);
      if (this.onSpeakingEnd) this.onSpeakingEnd();
      return;
    }

    // Cancel any stale queue
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    // Pick best matching natural voice
    const voices = this._availableBrowserVoices.length > 0
      ? this._availableBrowserVoices
      : window.speechSynthesis.getVoices();

    const isMale = this.voiceId === 'onwK4e9ZLuTAKqWW03F9' || this.voiceId === 'browser_natural_male';

    let selectedVoice = null;
    if (isMale) {
      selectedVoice = voices.find(v => (v.name.includes('Guy') || v.name.includes('Daniel') || v.name.includes('Male') || v.name.includes('David')) && v.lang.startsWith('en'))
        || voices.find(v => v.lang.startsWith('en-US'))
        || voices[0];
    } else {
      selectedVoice = voices.find(v => (v.name.includes('Google US English') || v.name.includes('Jenny') || v.name.includes('Samantha') || v.name.includes('Natural') || v.name.includes('Zira')) && v.lang.startsWith('en'))
        || voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onStateChange) this.onStateChange(this.isEnabled, true);
      if (this.onSpeakingStart) this.onSpeakingStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.onStateChange) this.onStateChange(this.isEnabled, false);
      if (this.onSpeakingEnd) this.onSpeakingEnd();
      if (typeof onFinished === 'function') onFinished();
    };

    utterance.onerror = (e) => {
      // 'interrupted' is normal when user speaks/barges-in
      if (e.error !== 'interrupted') {
        console.warn('Speech synthesis playback note:', e.error);
      }
      this.isSpeaking = false;
      if (this.onStateChange) this.onStateChange(this.isEnabled, false);
      if (this.onSpeakingEnd) this.onSpeakingEnd();
    };

    window.speechSynthesis.speak(utterance);
  }
}
