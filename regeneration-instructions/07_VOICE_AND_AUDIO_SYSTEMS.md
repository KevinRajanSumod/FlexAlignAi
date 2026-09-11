# FlexAlign AI — Voice & Audio Systems

This document outlines the Web Audio sound effects in `js/audio.js`, hands-free speech recognition in `js/voice-listener.js`, and neural voice synthesis in `js/elevenlabs.js`.

---

## 1. Web Audio Synthesizer (`js/audio.js`)

Uses the native browser `AudioContext` with zero external audio assets or audio file dependencies:

### 1.1 Sound Cues
1. **Target Reached Chime (`playTargetBeep`):**
   - High crisp harmonic sine burst (880 Hz $\rightarrow$ 1174.66 Hz, $A_5 \rightarrow D_6$).
   - Duration: 120 ms with fast exponential gain decay.
2. **Rep Success Fanfare (`playRepSuccess`):**
   - Ascending major triad chord ($C_5 \rightarrow E_5 \rightarrow G_5 \rightarrow C_6$).
   - Duration: 240 ms with warm reverberant envelope.
3. **Form Fault Alert (`playFaultAlert`):**
   - Low dual sawtooth tone (220 Hz detuned to 216 Hz for acoustic roughness).
   - Duration: 300 ms warning alert.

---

## 2. Hands-Free "Hey Coach" Voice Listener (`js/voice-listener.js`)

Enables athlete interaction while their hands are holding dumbbells, barbells, or in a plank position:

### 2.1 Engine Architecture
- Built on `window.SpeechRecognition` or `window.webkitSpeechRecognition`.
- Runs continuously (`continuous = true`, `interimResults = true`).
- Filters ambient background speech until the wake phrase **"Hey Coach"** or **"Coach"** is detected.

### 2.2 Two-Stage Interaction Loop
1. **Stage 1 (Passive Wake Word Detection):**
   - Listens for phrases starting with *"Hey Coach"*, *"Coach"*, or *"FlexAlign"*.
   - Once heard, enters **Awaiting Query** mode: triggers audio listening chime, activates HUD glowing indicator, and pulses the 3-dot audio wave.
2. **Stage 2 (Query Capture):**
   - Captures user's question (e.g. *"Hey Coach, how is my knee alignment?"* or *"Analyze my last set"*).
   - Dispatches query directly to `app.sendChatMessage(query)`.
   - Returns to passive listening.

---

## 3. Neural Voice Engine (`js/elevenlabs.js`)

Provides vocal feedback from the AI coach:

### 3.1 ElevenLabs API Integration
- **Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Models:** `eleven_multilingual_v2` or `eleven_turbo_v2`.
- **Supported Voices:**
  - *Rachel* (`21m00Tcm4TlvDq8ikWAM`) — Calm Athletic Trainer
  - *Domi* (`AZnzlk1XvdvUeBnXmlld`) — Energetic Strength Coach
  - *Bella* (`EXAVITQu4vr4xnSDxMaL`) — Clinical Physical Therapist
  - *Antoni* (`ErXwobaYiN019PkySvjV`) — Technical Sports Biomechanist
- **Streaming Audio:** Plays audio directly via Web Audio buffer or `new Audio(blobUrl)`.

### 3.2 Resilient Fallback (`window.speechSynthesis`)
If no ElevenLabs API key is provided or the device is offline, automatically falls back to native browser speech synthesis with tailored pitch, cadence, and volume.
