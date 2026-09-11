/**
 * FlexAlign AI - Intelligent Conversational Voice Engine & Wake-Word Detector
 * Features full-duplex interactive Call Mode, smart silence end-of-speech detection,
 * acoustic self-voice echo suppression, barge-in interruption, and continuous hands-free listening.
 */

export class VoiceListener {
  constructor(options = {}) {
    this.onWakeDetected = options.onWakeDetected || (() => {});
    this.onWakeWord = options.onWakeWord || (() => {});
    this.onListeningChange = options.onListeningChange || (() => {});
    this.onInterimSpeech = options.onInterimSpeech || (() => {});
    this.onCallSpeechComplete = options.onCallSpeechComplete || (() => {});
    this.onUserBargeIn = options.onUserBargeIn || (() => {});
    this.onError = options.onError || (() => {});

    this.recognition = null;
    this.isListening = false;
    this.isEnabled = true;
    this.isCallMode = false;
    this.isAwaitingQuestion = false;
    this.isCoachSpeaking = false; // Self-voice echo suppression flag

    // Speech Accumulation & Silence Debounce
    this._accumulatedText = '';
    this._silenceDebounceTimer = null;
    this._awaitingTimeout = null;
    this._wakeDetectedRecently = false;
    this._restartTimer = null;

    // Wake word patterns: "Hey Coach", "Hi Coach", "Coach", "Okay Coach", "Yo Coach"
    this.wakeWordRegex = /\b(?:hey|hay|hi|ok|okay|yo|a\.i\.|ai)?\s*coach\b\s*[,:\-\s]*(.*)/i;

    this._initRecognition();
  }

  _initRecognition() {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition API is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this._notifyState();
      };

      this.recognition.onresult = (event) => {
        // Acoustic Echo Suppression: Ignore mic input while Coach is speaking to prevent self-transcription loop
        if (this.isCoachSpeaking) {
          // Check for intentional user barge-in (user talking loudly to interrupt)
          let currentSpoken = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentSpoken += event.results[i][0].transcript + ' ';
          }
          currentSpoken = currentSpoken.trim();
          if (currentSpoken.length > 6) {
            this.onUserBargeIn(currentSpoken);
          }
          return;
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            final += text + ' ';
          } else {
            interim += text;
          }
        }

        const currentText = (final || interim).trim();
        if (!currentText) return;

        // Notify app for live HUD waveform / subtitle feedback
        this.onInterimSpeech(currentText, this.isAwaitingQuestion || this.isCallMode);

        if (this.isCallMode) {
          this._handleCallModeSpeech(currentText, Boolean(final));
        } else {
          this._handleWakeModeSpeech(currentText, Boolean(final));
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          console.warn('VoiceListener: Microphone permission not granted.');
          this.isEnabled = false;
          this.onError(event.error);
          return;
        }

        // 'no-speech' and 'aborted' are standard lifecycle events during pauses
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('VoiceListener speech recognition error:', event.error);
          this.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this._notifyState();

        // Continuous listening auto-restart if enabled or in call mode
        if (this.isEnabled || this.isCallMode) {
          clearTimeout(this._restartTimer);
          this._restartTimer = setTimeout(() => {
            if ((this.isEnabled || this.isCallMode) && !this.isListening) {
              try {
                this.recognition.start();
              } catch (e) {
                // Ignore if already starting
              }
            }
          }, 350);
        }
      };
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err);
    }
  }

  setCoachSpeaking(isSpeaking) {
    this.isCoachSpeaking = Boolean(isSpeaking);
    if (this.isCoachSpeaking) {
      clearTimeout(this._silenceDebounceTimer);
    }
  }

  _notifyState() {
    this.onListeningChange(this.isListening, this.isAwaitingQuestion, this.isCallMode);
  }

  /**
   * Interactive Call Mode Speech Handler:
   * Natural conversational flow without wake words.
   * Debounces pauses (1.3s of silence) to capture complete user thoughts.
   */
  _handleCallModeSpeech(text, isFinal) {
    this._accumulatedText = text;

    // Reset silence timer on every chunk of speech
    clearTimeout(this._silenceDebounceTimer);

    // If user pauses for 1.3s or finishes sentence, submit question
    const timeoutDuration = isFinal ? 850 : 1350;
    this._silenceDebounceTimer = setTimeout(() => {
      const fullQuery = this._accumulatedText.trim();
      if (fullQuery.length > 2) {
        this._accumulatedText = '';
        this.onCallSpeechComplete(fullQuery);
      }
    }, timeoutDuration);
  }

  /**
   * Hands-free "Hey Coach" wake-word handler
   */
  _handleWakeModeSpeech(text, isFinal) {
    // Case 1: Already awaiting question after wake word
    if (this.isAwaitingQuestion) {
      let cleanText = text.replace(this.wakeWordRegex, '$1').trim();
      if (!cleanText) cleanText = text.trim();

      this._accumulatedText = cleanText;

      clearTimeout(this._silenceDebounceTimer);
      const timeoutDuration = isFinal ? 800 : 1400;

      this._silenceDebounceTimer = setTimeout(() => {
        const fullQuery = this._accumulatedText.trim();
        if (fullQuery.length > 2) {
          clearTimeout(this._awaitingTimeout);
          this._accumulatedText = '';
          this.isAwaitingQuestion = false;
          this._notifyState();
          this.onWakeWord(fullQuery);
        }
      }, timeoutDuration);
      return;
    }

    // Case 2: Listening for "Hey Coach"
    const match = text.match(this.wakeWordRegex);
    if (match) {
      const remainingQuery = (match[1] || '').trim();

      if (!this._wakeDetectedRecently) {
        this._wakeDetectedRecently = true;
        setTimeout(() => { this._wakeDetectedRecently = false; }, 3500);
        this.onWakeDetected(remainingQuery);
      }

      if (remainingQuery.length > 4 && isFinal) {
        // User asked in one continuous breath
        this.onWakeWord(remainingQuery);
      } else {
        // Wake word triggered, now awaiting question
        this.isAwaitingQuestion = true;
        this._notifyState();

        clearTimeout(this._awaitingTimeout);
        this._awaitingTimeout = setTimeout(() => {
          this.isAwaitingQuestion = false;
          this._notifyState();
        }, 9000);
      }
    }
  }

  // ── Call Mode Control API ──

  startCallMode() {
    this.isCallMode = true;
    this.isEnabled = true;
    this.isAwaitingQuestion = false;
    this._accumulatedText = '';

    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (err) {
        // Ignore if already active
      }
    }
    this._notifyState();
  }

  stopCallMode() {
    this.isCallMode = false;
    this._accumulatedText = '';
    clearTimeout(this._silenceDebounceTimer);
    this._notifyState();
  }

  toggleCallMode() {
    if (this.isCallMode) {
      this.stopCallMode();
      return false;
    } else {
      this.startCallMode();
      return true;
    }
  }

  // ── Push-to-Talk / Standard Query API ──

  startListeningQuery() {
    this.isEnabled = true;
    this.isAwaitingQuestion = true;
    this._accumulatedText = '';

    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (err) {
        // Ignore if already active
      }
    }

    this._notifyState();

    clearTimeout(this._awaitingTimeout);
    this._awaitingTimeout = setTimeout(() => {
      this.isAwaitingQuestion = false;
      this._notifyState();
    }, 9000);
  }

  stopListeningQuery() {
    this.isAwaitingQuestion = false;
    clearTimeout(this._awaitingTimeout);
    clearTimeout(this._silenceDebounceTimer);
    this._notifyState();
  }

  start() {
    this.isEnabled = true;
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (err) {
        // Ignore
      }
    }
    this._notifyState();
  }

  stop() {
    this.isEnabled = false;
    this.isCallMode = false;
    this.isAwaitingQuestion = false;
    clearTimeout(this._awaitingTimeout);
    clearTimeout(this._silenceDebounceTimer);
    clearTimeout(this._restartTimer);

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore
      }
    }
    this._notifyState();
  }

  toggle() {
    if (this.isEnabled) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  isSupported() {
    return Boolean(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
  }
}
