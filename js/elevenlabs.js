/**
 * FlexAlign AI - ElevenLabs Text-to-Speech Engine
 * Generates natural, athletic coaching voice narration
 */

export const PROFESSIONAL_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Clinical Pro)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Authoritative)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Specialist)' }
];

export class ElevenLabsVoice {
  constructor() {
    this.apiKey = 'sk_ead522be1d1ca34f01499de3e2ea56692914bc7db5566c48';
    this.voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel - Calm, Clear & Highly Professional Clinical Voice
    this.modelId = 'eleven_turbo_v2_5';
    this.isEnabled = true;
    this.isSpeaking = false;
    this.currentAudio = null;
    this.onStateChange = null;
  }

  setVoice(voiceId) {
    if (this.isSpeaking) {
      this.stop();
    }
    this.voiceId = voiceId;
  }

  toggleVoice() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stop();
    }
    if (this.onStateChange) this.onStateChange(this.isEnabled, this.isSpeaking);
    return this.isEnabled;
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isSpeaking = false;
    if (this.onStateChange) this.onStateChange(this.isEnabled, false);
  }

  async speak(text) {
    if (!this.isEnabled || !text) return;

    // Clean markdown formatting before speaking
    const cleanText = text
      .replace(/[*#_`~>]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    this.stop();
    this.isSpeaking = true;
    if (this.onStateChange) this.onStateChange(this.isEnabled, true);

    try {
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
        throw new Error(`ElevenLabs Error ${response.status}: ${await response.text()}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        this.isSpeaking = false;
        this.currentAudio = null;
        if (this.onStateChange) this.onStateChange(this.isEnabled, false);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        this.isSpeaking = false;
        this.currentAudio = null;
        if (this.onStateChange) this.onStateChange(this.isEnabled, false);
      };

      await audio.play();
    } catch (err) {
      console.error('ElevenLabs TTS failed:', err);
      this.isSpeaking = false;
      this.currentAudio = null;
      if (this.onStateChange) this.onStateChange(this.isEnabled, false);
    }
  }
}
