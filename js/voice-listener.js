/**
 * FlexAlign AI - Hands-Free "Hey Coach" Voice Listener
 * Uses Web Speech API SpeechRecognition for real-time continuous wake-word
 * detection and speech-to-text querying without manual button presses.
 */

export class VoiceListener {
  constructor(options = {}) {
    this.onWakeDetected = options.onWakeDetected || (() => {});
    this.onWakeWord = options.onWakeWord || (() => {});
    this.onListeningChange = options.onListeningChange || (() => {});
    this.onInterimSpeech = options.onInterimSpeech || (() => {});
    this.onError = options.onError || (() => {});

    this.recognition = null;
    this.isListening = false;
    this.isEnabled = true;
    this.isAwaitingQuestion = false;
    this.awaitingTimeout = null;
    this._wakeDetectedRecently = false;

    // Wake word pattern: "Hey Coach", "Hi Coach", "Coach", "Okay Coach"
    this.wakeWordRegex = /\b(?:hey|hay|hi|ok|okay|a\.i\.|ai)?\s*coach\b\s*[,:\-\s]*(.*)/i;

    this._initRecognition();
  }

  _initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
        this.onListeningChange(true, this.isAwaitingQuestion);
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            finalTranscript += text + ' ';
          } else {
            interimTranscript += text;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          this.onInterimSpeech(currentText, this.isAwaitingQuestion);
          this._processTranscript(currentText, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          console.warn('VoiceListener: Microphone permission denied or blocked without user gesture.');
          this.isEnabled = false;
          this.onError(event.error);
          return;
        }

        // 'no-speech' and 'aborted' are normal in continuous listening
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('VoiceListener speech recognition error:', event.error);
          this.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onListeningChange(false, this.isAwaitingQuestion);
        // Automatically restart if continuous hands-free mode is enabled
        if (this.isEnabled) {
          setTimeout(() => {
            if (this.isEnabled && !this.isListening) {
              try {
                this.recognition.start();
              } catch (e) {
                // Ignore if already starting
              }
            }
          }, 450);
        }
      };
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err);
    }
  }

  _processTranscript(text, isFinal) {
    // Case 1: We were already waiting for a question after user said "Hey Coach" or tapped Mic
    if (this.isAwaitingQuestion) {
      // Clean leading wake words if repeated
      let cleanText = text.replace(this.wakeWordRegex, '$1').trim();
      if (!cleanText) cleanText = text.trim();

      if (isFinal && cleanText.length > 1) {
        clearTimeout(this.awaitingTimeout);
        this.isAwaitingQuestion = false;
        this.onListeningChange(this.isListening, false);
        this.onWakeWord(cleanText);
      }
      return;
    }

    // Case 2: Check if speech matches wake word "Hey Coach"
    const match = text.match(this.wakeWordRegex);
    if (match) {
      const remainingQuery = (match[1] || '').trim();

      // Immediately alert app so AI Coach drawer opens and user sees it!
      if (!this._wakeDetectedRecently) {
        this._wakeDetectedRecently = true;
        setTimeout(() => { this._wakeDetectedRecently = false; }, 3500);
        this.onWakeDetected(remainingQuery);
      }

      if (remainingQuery.length > 3 && isFinal) {
        // User said: "Hey coach how is my squat depth" in a single breath
        this.onWakeWord(remainingQuery);
      } else {
        // Wake word triggered, now awaiting user's form question
        this.isAwaitingQuestion = true;
        this.onListeningChange(this.isListening, true);

        // Auto-cancel question waiting if user doesn't speak within 9 seconds
        clearTimeout(this.awaitingTimeout);
        this.awaitingTimeout = setTimeout(() => {
          this.isAwaitingQuestion = false;
          this.onListeningChange(this.isListening, false);
        }, 9000);
      }
    }
  }

  /**
   * Push-to-talk / Direct Voice Query initiation (triggered by user button click)
   */
  startListeningQuery() {
    this.isEnabled = true;
    this.isAwaitingQuestion = true;

    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Speech recognition start failed or already active:', err);
      }
    }

    this.onListeningChange(true, true);

    clearTimeout(this.awaitingTimeout);
    this.awaitingTimeout = setTimeout(() => {
      this.isAwaitingQuestion = false;
      this.onListeningChange(this.isListening, false);
    }, 9000);
  }

  stopListeningQuery() {
    this.isAwaitingQuestion = false;
    clearTimeout(this.awaitingTimeout);
    this.onListeningChange(this.isListening, false);
  }

  start() {
    this.isEnabled = true;
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Speech recognition start failed or already active:', err);
      }
    }
  }

  stop() {
    this.isEnabled = false;
    this.isAwaitingQuestion = false;
    clearTimeout(this.awaitingTimeout);
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Speech recognition stop error:', err);
      }
    }
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
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}
