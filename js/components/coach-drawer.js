/**
 * FlexAlign AI - AI Coach Drawer Component
 * Manages conversational AI chat, voice wake ("Hey Coach") UI indicators,
 * chat bubbles, push-to-talk mic, auto session analysis, and API key configuration.
 */

import { getExerciseDefinition, GYM_EXERCISES, PT_EXERCISES } from '../exercises.js';

export class CoachDrawer {
  constructor(options = {}) {
    this.app = options.app;
  }

  setDashboardTab(tabName) {
    const tabs = ['waveform', 'standards', 'history'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
      const pane = document.getElementById(`deckPane${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (pane) pane.classList.toggle('active', t === tabName);
    });

    if (tabName === 'waveform' && this.app) {
      const ex = GYM_EXERCISES[this.app.evaluator.currentExercise] || PT_EXERCISES[this.app.evaluator.currentExercise];
      const targetDeg = this.app.evaluator.mode === 'gym' ? ((ex && ex.defaultTarget) || 90) : (this.app.evaluator.therapySafeThresholds[this.app.evaluator.currentExercise] || 90);
      if (this.app.waveform) this.app.waveform.render(this.app.evaluator.mode, targetDeg);
    }
  }

  openCoachDrawer() {
    const drawer = document.getElementById('aiCoachDrawer');
    const backdrop = document.getElementById('aiCoachBackdrop');
    const fab = document.getElementById('aiCoachFabBtn');
    if (drawer) {
      drawer.classList.add('open');
      drawer.style.display = 'flex';
      drawer.style.transform = 'translateX(0)';
      drawer.style.visibility = 'visible';
      drawer.style.opacity = '1';
    }
    if (backdrop) {
      backdrop.classList.add('open');
      backdrop.style.display = 'block';
      backdrop.style.opacity = '1';
      backdrop.style.pointerEvents = 'auto';
    }
    if (fab) fab.classList.add('hidden-fab');

    const input = document.getElementById('aiChatInput');
    if (input) setTimeout(() => input.focus(), 150);
    const msgs = document.getElementById('aiChatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  closeCoachDrawer() {
    const drawer = document.getElementById('aiCoachDrawer');
    const backdrop = document.getElementById('aiCoachBackdrop');
    const fab = document.getElementById('aiCoachFabBtn');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.transform = 'translateX(105%)';
    }
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.style.opacity = '0';
      backdrop.style.pointerEvents = 'none';
      setTimeout(() => {
        if (!drawer || !drawer.classList.contains('open')) {
          backdrop.style.display = 'none';
        }
      }, 300);
    }
    if (fab) fab.classList.remove('hidden-fab');

    this.removeListeningIndicatorFromChat();
  }

  toggleCoachDrawer(forceOpen) {
    const drawer = document.getElementById('aiCoachDrawer');
    if (!drawer) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !drawer.classList.contains('open');
    if (shouldOpen) {
      this.openCoachDrawer();
    } else {
      this.closeCoachDrawer();
    }
  }

  toggleCoachSection() {
    this.toggleCoachDrawer();
  }

  setVoiceRate(rate) {
    if (this.app && this.app.voice) {
      this.app.voice.setRate(rate);
      if (this.app.showToast) this.app.showToast(`Voice speed: ${rate}x`, '⚡');
    }
  }

  handleVoiceWakeButtonClick() {
    if (!this.app || !this.app.voiceListener) return;

    const drawer = document.getElementById('aiCoachDrawer');
    const isDrawerOpen = drawer && drawer.classList.contains('open');

    if (!isDrawerOpen) {
      this.openCoachDrawer();
      if (this.app.audio) this.app.audio.playCoachWakeChime();
      this.app.voiceListener.startListeningQuery();
      this.showListeningIndicatorInChat();
      this.showVoiceHudToast('Listening to your form question...');
      return;
    }

    this.toggleVoiceWake();
  }

  handleMicButtonClick() {
    if (!this.app || !this.app.voiceListener) return;

    if (this.app.voiceListener.isAwaitingQuestion) {
      this.app.voiceListener.stopListeningQuery();
      this.removeListeningIndicatorFromChat();
      const input = document.getElementById('aiChatInput');
      if (input && input.value.trim().length > 1) {
        this.sendChatMessage(input.value.trim());
        input.value = '';
      }
    } else {
      this.openCoachDrawer();
      if (this.app.audio) this.app.audio.playCoachWakeChime();
      this.app.voiceListener.startListeningQuery();
      this.showListeningIndicatorInChat();
      this.showVoiceHudToast('Listening... Speak your form question');
    }
  }

  toggleVoiceWake() {
    if (!this.app || !this.app.voiceListener) return;
    const isNowActive = this.app.voiceListener.toggle();
    const navBtn = document.getElementById('voiceWakeBtn');
    const drawerBtn = document.getElementById('btnDrawerVoiceWake');

    if (navBtn) {
      navBtn.classList.toggle('active', isNowActive);
      const label = navBtn.querySelector('.voice-wake-label');
      if (label) label.textContent = isNowActive ? '"Hey Coach"' : '"Hey Coach" Muted';
    }
    if (drawerBtn) {
      drawerBtn.classList.toggle('active', isNowActive);
      drawerBtn.textContent = isNowActive ? '🎙️ "Hey Coach" ON' : '🎙️ "Hey Coach" OFF';
    }

    if (this.app && this.app.showToast) {
      this.app.showToast(
        isNowActive ? 'Hands-Free Voice Active: Say "Hey Coach" anytime!' : 'Hands-Free Voice Muted',
        isNowActive ? '🎙️' : '🔇'
      );
    }
  }

  handleWakeDetected(initialQuery) {
    if (this.app && this.app.audio) {
      this.app.audio.playCoachWakeChime();
    }

    this.openCoachDrawer();
    this.showVoiceHudToast(initialQuery || 'Listening for your question...');
    this.showListeningIndicatorInChat();
  }

  handleWakeWordQuery(query) {
    this.removeListeningIndicatorFromChat();
    this.openCoachDrawer();

    if (query && query.trim().length > 1) {
      setTimeout(() => {
        this.sendChatMessage(query.trim(), false);
      }, 200);
    }
  }

  showListeningIndicatorInChat() {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;

    this.removeListeningIndicatorFromChat();

    const indicator = document.createElement('div');
    indicator.id = 'aiChatListeningIndicator';
    indicator.className = 'ai-listening-indicator';
    indicator.innerHTML = `
      <span class="ai-sparkle-dot">🎙️</span>
      <span id="aiChatListeningText">Listening... Speak your form question</span>
      <div style="display: flex; gap: 4px; margin-left: auto;">
        <div class="listening-wave-dot"></div>
        <div class="listening-wave-dot"></div>
        <div class="listening-wave-dot"></div>
      </div>
    `;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
  }

  removeListeningIndicatorFromChat() {
    const indicator = document.getElementById('aiChatListeningIndicator');
    if (indicator) indicator.remove();
  }

  updateVoiceWakeUI(isListening, isAwaitingQuestion, isCallMode) {
    const navBtn = document.getElementById('voiceWakeBtn');
    const drawerMicBtn = document.getElementById('btnDrawerMic');
    const drawerBtn = document.getElementById('btnDrawerVoiceWake');

    if (navBtn) {
      navBtn.classList.toggle('listening', Boolean(isAwaitingQuestion));
      navBtn.classList.toggle('active', Boolean(isListening));
      const label = navBtn.querySelector('.voice-wake-label');
      if (label) {
        if (isAwaitingQuestion) {
          label.textContent = 'Listening...';
        } else if (isListening) {
          label.textContent = '"Hey Coach"';
        } else {
          label.textContent = '"Hey Coach" Muted';
        }
      }
    }

    if (drawerMicBtn) {
      drawerMicBtn.classList.toggle('listening', Boolean(isAwaitingQuestion));
      drawerMicBtn.title = isAwaitingQuestion ? 'Listening... Tap to send' : 'Speak to Coach (Push-to-Talk)';
    }

    if (drawerBtn) {
      drawerBtn.classList.toggle('active', Boolean(isListening));
      drawerBtn.textContent = isListening ? '🎙️ "Hey Coach" ON' : '🎙️ "Hey Coach" OFF';
    }

    const toast = document.getElementById('voiceHudToast');
    if (toast && !isCallMode) {
      if (isAwaitingQuestion) {
        toast.classList.remove('hidden');
        const transcriptEl = document.getElementById('voiceHudTranscript');
        if (transcriptEl) transcriptEl.textContent = 'Say your form question or cue...';
      } else {
        setTimeout(() => toast.classList.add('hidden'), 2500);
      }
    }

    if (!isAwaitingQuestion) {
      this.removeListeningIndicatorFromChat();
    }
  }

  updateVoiceInterimHUD(transcript, isAwaitingQuestion) {
    const transcriptEl = document.getElementById('voiceHudTranscript');
    if (transcriptEl && transcript) {
      transcriptEl.textContent = `"${transcript}"`;
    }
    const listeningText = document.getElementById('aiChatListeningText');
    if (listeningText && transcript) {
      listeningText.textContent = `"${transcript}"`;
    }
    const chatInput = document.getElementById('aiChatInput');
    if (chatInput && isAwaitingQuestion && transcript) {
      chatInput.value = transcript;
    }
    const callUserTranscript = document.getElementById('callUserTranscript');
    if (callUserTranscript && this.app && this.app.isCallActive && transcript) {
      callUserTranscript.textContent = `"${transcript}"`;
    }
  }

  showVoiceHudToast(text) {
    const toast = document.getElementById('voiceHudToast');
    const transcriptEl = document.getElementById('voiceHudTranscript');
    if (toast) {
      toast.classList.remove('hidden');
      if (transcriptEl) transcriptEl.textContent = `"${text}"`;
      setTimeout(() => toast.classList.add('hidden'), 3500);
    }
  }

  async sendChatMessage(userText, isVoiceCall = false) {
    if (!userText || !userText.trim() || !this.app || !this.app.gemini || this.app.gemini.isLoading) return;
    userText = userText.trim();

    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('btnSendChat');
    if (input) input.value = '';
    if (sendBtn) sendBtn.disabled = true;

    this.addChatBubble('user', userText);
    this.showTypingIndicator(true);

    const callSubtitleLabel = document.getElementById('callSubtitleLabel');
    if (callSubtitleLabel && this.app.isCallActive) {
      callSubtitleLabel.textContent = 'COACH THINKING...';
    }

    const currentEx = (this.app.evaluator && this.app.evaluator.currentExercise) || 'squat';
    const exDef = getExerciseDefinition(currentEx) || GYM_EXERCISES[currentEx] || PT_EXERCISES[currentEx];
    const exName = (exDef && exDef.name) || currentEx;
    const sessionCtx = {
      exercise: exName,
      mode: this.app.evaluator.mode,
      reps: this.app.evaluator.repCount,
      peakRom: `${this.app.evaluator.peakRom}°`,
      compliance: Math.round(this.app.evaluator.complianceScore),
      faults: this.app.evaluator.faultCount
    };

    const result = await this.app.gemini.chat(userText, sessionCtx, isVoiceCall);

    this.showTypingIndicator(false);
    if (sendBtn) sendBtn.disabled = false;

    let responseText = '';
    if (result.success && result.text) {
      responseText = result.text;
    } else {
      responseText = this.app.gemini.generateSmartFallback(userText, sessionCtx, isVoiceCall);
    }

    this.addChatBubble('assistant', responseText);

    const callCoachResponse = document.getElementById('callCoachResponse');
    if (callCoachResponse && this.app.isCallActive) {
      callCoachResponse.textContent = `"${this.app.voice ? this.app.voice.cleanTextForSpeech(responseText) : responseText}"`;
      callCoachResponse.style.display = 'block';
    }

    if ((this.app._voiceEnabled || this.app.isCallActive) && this.app.voice) {
      this.app.voice.speak(responseText);
    }
  }

  async requestAutoAnalysis() {
    if (!this.app || !this.app.gemini || this.app.gemini.isLoading) return;

    const sendBtn = document.getElementById('btnSendChat');
    if (sendBtn) sendBtn.disabled = true;

    this.addChatBubble('user', '📊 Analyze my current session');
    this.showTypingIndicator(true);

    const currentEx = (this.app.evaluator && this.app.evaluator.currentExercise) || 'squat';
    const exDef = getExerciseDefinition(currentEx) || GYM_EXERCISES[currentEx] || PT_EXERCISES[currentEx];
    const exName = (exDef && exDef.name) || currentEx;

    const sessionData = {
      exercise: exName,
      mode: this.app.evaluator.mode,
      reps: this.app.evaluator.repCount,
      peakRom: `${this.app.evaluator.peakRom}°`,
      compliance: Math.round(this.app.evaluator.complianceScore),
      faults: this.app.evaluator.faultCount,
      history: this.app.evaluator.repHistory
    };

    const result = await this.app.gemini.analyzeSession(sessionData);

    this.showTypingIndicator(false);
    if (sendBtn) sendBtn.disabled = false;

    if (result.success && result.text) {
      this.addChatBubble('assistant', result.text);
      if (this.app._voiceEnabled && this.app.voice) {
        const spoken = result.text.replace(/[*_#•]/g, '').replace(/⚡|⚠️|🌟|👍|🤖/g, '');
        this.app.voice.speak(spoken);
      }
      if (this.app.showToast) this.app.showToast('AI Coach analysis ready', '✨');
    } else {
      const fallbackResponse = this.app.gemini.generateSmartFallback('Analyze my workout session', sessionData);
      this.addChatBubble('assistant', fallbackResponse);
      if (this.app._voiceEnabled && this.app.voice) {
        const spoken = fallbackResponse.replace(/[*_#•]/g, '').replace(/⚡|⚠️|🌟|👍|🤖/g, '');
        this.app.voice.speak(spoken);
      }
      if (this.app.showToast) this.app.showToast('AI Coach analysis ready', '✨');
    }
  }

  addChatBubble(role, text) {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `ai-chat-bubble ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'bubble-avatar';
    avatar.textContent = role === 'assistant' ? '🤖' : '🧑';

    const content = document.createElement('div');
    content.className = 'bubble-content';

    const formatted = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    content.innerHTML = `<p>${formatted}</p>`;

    bubble.appendChild(avatar);
    bubble.appendChild(content);
    container.appendChild(bubble);

    container.scrollTop = container.scrollHeight;
  }

  showTypingIndicator(show) {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;

    const existing = container.querySelector('.ai-typing-bubble');
    if (existing) existing.remove();

    if (show) {
      const bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble assistant ai-typing-bubble';
      bubble.innerHTML = `
        <div class="bubble-avatar">🤖</div>
        <div class="bubble-content">
          <div class="ai-typing-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      `;
      container.appendChild(bubble);
      container.scrollTop = container.scrollHeight;
    }
  }

  toggleVoice() {
    if (!this.app) return;
    this.app._voiceEnabled = !this.app._voiceEnabled;
    const btn = document.getElementById('btnVoiceToggle');
    if (btn) {
      btn.classList.toggle('active', this.app._voiceEnabled);
      btn.textContent = this.app._voiceEnabled ? '🔊 Voice' : '🔇 Voice';
    }
    if (!this.app._voiceEnabled && this.app.voice) {
      this.app.voice.stop();
    }
    if (this.app.showToast) {
      this.app.showToast(this.app._voiceEnabled ? 'Voice responses enabled' : 'Voice responses muted', this.app._voiceEnabled ? '🔊' : '🔇');
    }
  }

  clearChat() {
    const container = document.getElementById('aiChatMessages');
    if (container) {
      container.innerHTML = `
        <div class="ai-chat-bubble assistant">
          <div class="bubble-avatar">🤖</div>
          <div class="bubble-content">
            <p>Chat cleared! How can I help you with your workout?</p>
          </div>
        </div>
      `;
    }
    if (this.app && this.app.gemini) {
      this.app.gemini.clearHistory();
    }
    if (this.app && this.app.showToast) {
      this.app.showToast('Chat history cleared', '🗑️');
    }
  }

  promptApiKey() {
    if (!this.app || !this.app.gemini) return;
    const currentCustom = localStorage.getItem('flexalign_gemini_api_key') || '';
    const newKey = prompt(
      'Configure Google Gemini API Key:\n\n' +
      'Paste your Gemini API key (from https://aistudio.google.com/app/apikey) to use your dedicated quota.\n' +
      'Leave empty and press OK to restore default shared key.',
      currentCustom
    );

    if (newKey !== null) {
      this.app.gemini.setApiKey(newKey);
      if (this.app.showToast) {
        if (newKey.trim()) {
          this.app.showToast('Custom Gemini API Key active! 🔑', '✨');
        } else {
          this.app.showToast('Using default shared Gemini Key', 'ℹ️');
        }
      }
    }
  }
}
