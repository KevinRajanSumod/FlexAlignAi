/**
 * FlexAlign AI - Interactive Voice Call Mode Component
 * Full-duplex conversational overlay with soundwave equalizer, timer, mute/unmute,
 * and user barge-in audio interruption support.
 */

import { getExerciseDefinition } from '../exercises.js';

export class CallOverlay {
  constructor(options = {}) {
    this.app = options.app;
    this.isCallActive = false;
    this.callDurationSecs = 0;
    this.callTimerInterval = null;
    this.isCallMuted = false;
  }

  toggleCallMode() {
    if (this.isCallActive) {
      this.endCallMode();
    } else {
      this.startCallMode();
    }
  }

  startCallMode() {
    if (this.isCallActive) return;
    this.isCallActive = true;
    this.isCallMuted = false;
    this.callDurationSecs = 0;

    const callBtn = document.getElementById('callModeNavBtn');
    const drawerCallBtn = document.getElementById('btnDrawerCallMode');
    const overlay = document.getElementById('aiCallOverlay');
    const timerEl = document.getElementById('callTimer');
    const userSubEl = document.getElementById('callUserTranscript');
    const coachSubEl = document.getElementById('callCoachResponse');
    const subtitleLabel = document.getElementById('callSubtitleLabel');

    if (callBtn) {
      callBtn.classList.add('in-call');
      const label = callBtn.querySelector('.call-nav-label');
      if (label) label.textContent = 'In Call (Live)';
    }
    if (drawerCallBtn) {
      drawerCallBtn.classList.add('active');
      drawerCallBtn.textContent = '🔴 End Call';
    }

    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.remove('speaking');
      overlay.classList.add('listening');
    }
    if (subtitleLabel) subtitleLabel.textContent = 'LISTENING TO YOU';
    if (userSubEl) userSubEl.textContent = 'Say your form question or ask for real-time cues...';
    if (coachSubEl) {
      coachSubEl.style.display = 'none';
      coachSubEl.textContent = '';
    }
    if (timerEl) timerEl.textContent = '00:00';

    clearInterval(this.callTimerInterval);
    this.callTimerInterval = setInterval(() => {
      this.callDurationSecs++;
      const mins = String(Math.floor(this.callDurationSecs / 60)).padStart(2, '0');
      const secs = String(this.callDurationSecs % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);

    if (this.app && this.app.audio) this.app.audio.playCoachWakeChime();

    if (this.app && this.app.voiceListener) {
      this.app.voiceListener.startCallMode();
    }

    const currentEx = (this.app && this.app.evaluator && this.app.evaluator.currentExercise) || 'squat';
    const exDef = getExerciseDefinition(currentEx);
    const exName = (exDef && exDef.name) || 'your exercise';
    const greeting = `Connected to Coach. I am watching your ${exName}. What can I help you adjust?`;

    setTimeout(() => {
      if (this.isCallActive && this.app && this.app.voice && this.app._voiceEnabled) {
        if (coachSubEl) {
          coachSubEl.textContent = `"${greeting}"`;
          coachSubEl.style.display = 'block';
        }
        this.app.voice.speak(greeting);
      }
    }, 350);

    if (this.app) this.app.showToast('Call Mode Active: Talk freely with your AI Coach!', '📞');
  }

  endCallMode() {
    if (!this.isCallActive) return;
    this.isCallActive = false;
    clearInterval(this.callTimerInterval);

    if (this.app && this.app.voice) this.app.voice.stop();
    if (this.app && this.app.voiceListener) this.app.voiceListener.stopCallMode();

    const callBtn = document.getElementById('callModeNavBtn');
    const drawerCallBtn = document.getElementById('btnDrawerCallMode');
    const overlay = document.getElementById('aiCallOverlay');

    if (callBtn) {
      callBtn.classList.remove('in-call');
      const label = callBtn.querySelector('.call-nav-label');
      if (label) label.textContent = 'Talk to Coach';
    }
    if (drawerCallBtn) {
      drawerCallBtn.classList.remove('active');
      drawerCallBtn.textContent = '📞 Call Mode';
    }
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('speaking', 'listening');
    }

    if (this.app) this.app.showToast('Coaching Call Ended.', '🛑');
  }

  toggleCallMute() {
    if (!this.isCallActive) return;
    this.isCallMuted = !this.isCallMuted;

    if (this.app && this.app.voiceListener) {
      if (this.isCallMuted) {
        this.app.voiceListener.stop();
      } else {
        this.app.voiceListener.startCallMode();
      }
    }

    const icon = document.getElementById('callMuteIcon');
    const label = document.getElementById('callMuteLabel');
    if (icon) icon.textContent = this.isCallMuted ? '🔇' : '🎙️';
    if (label) label.textContent = this.isCallMuted ? 'Unmute' : 'Mute';
    if (this.app) this.app.showToast(this.isCallMuted ? 'Microphone Muted' : 'Microphone Active', this.isCallMuted ? '🔇' : '🎙️');
  }

  interruptCoach() {
    if (this.app && this.app.voice) {
      this.app.voice.stop();
    }
    if (this.app && this.app.voiceListener) {
      this.app.voiceListener.setCoachSpeaking(false);
    }
    this.updateCallSpeakingState(false);
    if (this.app) this.app.showToast('Coach interrupted.', '⚡');
  }

  handleUserBargeIn(text) {
    if (this.app && this.app.voice && this.app.voice.isSpeaking) {
      this.app.voice.stop();
      if (this.app && this.app.voiceListener) {
        this.app.voiceListener.setCoachSpeaking(false);
      }
      this.updateCallSpeakingState(false);
    }
  }

  handleCallSpeechComplete(query) {
    if (!this.isCallActive || !query || query.trim().length < 2) return;

    const userSubEl = document.getElementById('callUserTranscript');
    const subtitleLabel = document.getElementById('callSubtitleLabel');
    if (userSubEl) userSubEl.textContent = `"${query.trim()}"`;
    if (subtitleLabel) subtitleLabel.textContent = 'COACH THINKING...';

    if (this.app && this.app.coachDrawer) {
      this.app.coachDrawer.sendChatMessage(query.trim(), true);
    } else if (this.app && this.app.sendChatMessage) {
      this.app.sendChatMessage(query.trim(), true);
    }
  }

  updateCallSpeakingState(isSpeaking) {
    const overlay = document.getElementById('aiCallOverlay');
    const subtitleLabel = document.getElementById('callSubtitleLabel');

    if (overlay) {
      if (isSpeaking) {
        overlay.classList.add('speaking');
        overlay.classList.remove('listening');
      } else {
        overlay.classList.remove('speaking');
        overlay.classList.add('listening');
      }
    }

    if (subtitleLabel && this.isCallActive) {
      subtitleLabel.textContent = isSpeaking ? 'COACH SPEAKING' : 'LISTENING TO YOU';
    }
  }
}
