/**
 * FlexAlign AI - Main Application Controller
 * Orchestrates MediaPipe Pose stream, UI components, evaluator, HUD, and audio telemetry.
 * v2 additions:
 *  - Side auto-detect hysteresis (2s cooldown + 0.15 score gap)
 *  - 3D avatar (Avatar3DRenderer) shown during simulation mode
 */

import { AudioEngine } from './audio.js';
import { GYM_EXERCISES, PT_EXERCISES, registerExercise, modifyExerciseDefinition, getExerciseDefinition, getAllExercisesForMode, CUSTOM_EXERCISES, synthesizeExerciseFromQuery } from './exercises.js';
import { ExerciseEvaluator } from './evaluator.js';
import { HUDRenderer } from './renderer.js';
import { WaveformChart } from './waveform.js';
import { MotionSimulator } from './simulator.js';
import { Avatar3DRenderer } from './avatar3d.js';
import { calculateJointAngle } from './math.js';
import { GeminiCoach } from './gemini.js';
import { ElevenLabsVoice } from './elevenlabs.js';
import { VoiceListener } from './voice-listener.js';

export class FlexAlignApp {
  constructor() {
    // Core Subsystems
    this.audio = new AudioEngine();
    this.evaluator = new ExerciseEvaluator(this.audio);
    this.simulator = new MotionSimulator();
    this.avatar3d = new Avatar3DRenderer();
    this.gemini = new GeminiCoach();
    this.voice = new ElevenLabsVoice();
    this._voiceEnabled = true;

    // Hands-Free "Hey Coach" Voice Listener
    this.voiceListener = new VoiceListener({
      onWakeDetected: (initialQuery) => this.handleWakeDetected(initialQuery),
      onWakeWord: (query) => this.handleWakeWordQuery(query),
      onListeningChange: (isListening, isAwaiting) => this.updateVoiceWakeUI(isListening, isAwaiting),
      onInterimSpeech: (text, isAwaiting) => this.updateVoiceInterimHUD(text, isAwaiting),
      onError: (err) => console.warn('Voice listener error:', err)
    });

    // DOM Bindings
    this.video = document.getElementById('webcamVideo');
    this.canvas = document.getElementById('outputCanvas');
    this.chartCanvas = document.getElementById('angleChartCanvas');
    this.avatarCanvas = document.getElementById('avatarCanvas3D');

    this.hud = new HUDRenderer(this.canvas);
    this.waveform = new WaveformChart(this.chartCanvas);

    // Stream State
    this.pose = null;
    this.camera = null;
    this.isCameraRunning = false;
    this.isSimulationRunning = false;
    this.animFrameId = null;
    this.simFaultActive = false;

    // Side Auto-Detect Hysteresis
    this.sidePreference = 'auto'; // 'auto' | 'left' | 'right'
    this._lastResolvedSide = 'left';
    this._lastSideChangeTime = 0;
    this._SIDE_CHANGE_COOLDOWN_MS = 2000;
    this._SIDE_SCORE_GAP = 0.15;

    // Coach Tip Timing: show after exercise / rep is done, not during movement
    this.postRepCoachTipTimer = null;
    this.isShowingPostRepTip = false;

    // AI Exercise Lab State
    this.aiLabTab = 'add';
    this.currentGeneratedExercise = null;

    // Initialize Subsystems & UI
    this.initMediaPipe();
    this.bindEvents();
    this.setMode('gym');

    // Auto-start hands-free "Hey Coach" voice listener
    if (this.voiceListener && this.voiceListener.isSupported()) {
      this.voiceListener.start();
    }

    // Handle URL query parameters for direct demo & automated test runs
    this.handleUrlParams();
  }

  initMediaPipe() {
    if (typeof Pose === 'undefined') {
      console.warn('MediaPipe Pose script loading from CDN...');
      return;
    }

    try {
      this.pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
      });

      this.pose.onResults((results) => this.onPoseResults(results));
    } catch (err) {
      console.error('Error instantiating MediaPipe Pose:', err);
      this.showToast('Could not load MediaPipe Pose. Check internet connection.', '⚠️');
    }
  }

  /**
   * Resolve which side to track with hysteresis to prevent mid-rep flipping.
   */
  /**
   * Resolve which side to track: 'both', 'left', or 'right'.
   * When limbs are actively in motion on both sides, selects 'both'.
   * When unilateral motion occurs, selects the moving limb.
   */
  resolveActiveSide(landmarks) {
    if (this.sidePreference === 'left') return 'left';
    if (this.sidePreference === 'right') return 'right';
    if (!landmarks || landmarks.length < 29) return 'both';

    const ex = this.evaluator.currentExercise;

    const leftArmVis = ((landmarks[11]?.visibility || 0) + (landmarks[13]?.visibility || 0) + (landmarks[15]?.visibility || 0)) / 3;
    const rightArmVis = ((landmarks[12]?.visibility || 0) + (landmarks[14]?.visibility || 0) + (landmarks[16]?.visibility || 0)) / 3;
    const leftLegVis = ((landmarks[23]?.visibility || 0) + (landmarks[25]?.visibility || 0) + (landmarks[27]?.visibility || 0)) / 3;
    const rightLegVis = ((landmarks[24]?.visibility || 0) + (landmarks[26]?.visibility || 0) + (landmarks[28]?.visibility || 0)) / 3;

    // Squat: bilateral lower body compound movement
    if (ex === 'gym_squat' || ex === 'squat') {
      if (leftLegVis > 0.35 && rightLegVis > 0.35) return 'both';
      return leftLegVis >= rightLegVis ? 'left' : 'right';
    }

    // Overhead Press: bilateral upper body push
    if (ex === 'gym_press') {
      if (leftArmVis > 0.35 && rightArmVis > 0.35) return 'both';
      return leftArmVis >= rightArmVis ? 'left' : 'right';
    }

    // Bicep Curls:
    if (ex === 'gym_curl' || ex === 'curl' || ex === 'pt_elbow_flex') {
      if (leftArmVis > 0.5 && rightArmVis < 0.25) return 'left';
      if (rightArmVis > 0.5 && leftArmVis < 0.25) return 'right';

      const leftAngle = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
      const rightAngle = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);

      // Detect motion: check if arm is actively curling (< 150°)
      const isCurlingL = leftAngle > 0 && leftAngle < 150;
      const isCurlingR = rightAngle > 0 && rightAngle < 150;

      if (isCurlingL && isCurlingR) return 'both';
      if (isCurlingL && !isCurlingR && rightAngle > 155) return 'left';
      if (isCurlingR && !isCurlingL && leftAngle > 155) return 'right';

      if (leftArmVis > 0.35 && rightArmVis > 0.35) return 'both';
      return leftArmVis >= rightArmVis ? 'left' : 'right';
    }

    // Triceps Extension:
    if (ex === 'gym_extension' || ex === 'pt_elbow_ext') {
      if (leftArmVis > 0.5 && rightArmVis < 0.25) return 'left';
      if (rightArmVis > 0.5 && leftArmVis < 0.25) return 'right';

      const leftAngle = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
      const rightAngle = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);

      if (Math.abs(leftAngle - rightAngle) >= 30) {
        return leftAngle > rightAngle ? 'left' : 'right';
      }
      if (leftArmVis > 0.35 && rightArmVis > 0.35) return 'both';
      return leftArmVis >= rightArmVis ? 'left' : 'right';
    }

    // PT Shoulder Lateral Raise:
    if (ex === 'pt_raise' || ex === 'raise') {
      const leftAngle = calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]);
      const rightAngle = calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]);

      const isRaisedL = leftAngle > 30;
      const isRaisedR = rightAngle > 30;

      if (isRaisedL && isRaisedR) return 'both';
      if (isRaisedL && !isRaisedR && rightAngle <= 25) return 'left';
      if (isRaisedR && !isRaisedL && leftAngle <= 25) return 'right';
      if (leftArmVis > 0.35 && rightArmVis > 0.35) return 'both';
      return leftArmVis >= rightArmVis ? 'left' : 'right';
    }

    // PT Knee Extension:
    if (ex === 'pt_knee_ext') {
      const leftAngle = calculateJointAngle(landmarks[23], landmarks[25], landmarks[27]);
      const rightAngle = calculateJointAngle(landmarks[24], landmarks[26], landmarks[28]);

      const isExtL = leftAngle > 110;
      const isExtR = rightAngle > 110;

      if (isExtL && isExtR) return 'both';
      if (isExtL && !isExtR) return 'left';
      if (isExtR && !isExtL) return 'right';
      if (leftLegVis > 0.35 && rightLegVis > 0.35) return 'both';
      return leftLegVis >= rightLegVis ? 'left' : 'right';
    }

    return 'both';
  }

  onPoseResults(results) {
    if (!results.image) return;

    this.hud.resize(results.image.width, results.image.height);
    this.hud.clear();

    const hudDot = document.getElementById('hudLiveDot');
    const hudText = document.getElementById('hudTrackingText');

    if (!results.poseLandmarks) {
      hudDot.classList.remove('active');
      hudText.textContent = 'NO POSE DETECTED';
      return;
    }

    // Continuous Exercise Synchronizer: Ensure dropdown and evaluator never drift
    const selectEl = document.getElementById('exerciseSelect');
    if (selectEl && selectEl.value && selectEl.value !== this.evaluator.currentExercise) {
      this.setExercise(selectEl.value);
    }

    const landmarks = results.poseLandmarks;
    const side = this.resolveActiveSide(landmarks);
    const sideBadge = document.getElementById('activeSideBadge');
    if (sideBadge) {
      if (side === 'both') {
        const isLeg = this.evaluator.currentExercise.includes('squat') || this.evaluator.currentExercise.includes('knee');
        sideBadge.textContent = `AUTO (BOTH ${isLeg ? 'LEGS' : 'ARMS'})`;
      } else {
        sideBadge.textContent = `${this.sidePreference.toUpperCase()} (${side.toUpperCase()})`;
      }
    }

    // Evaluate Biomechanics
    const evalResult = this.evaluator.evaluate(landmarks, side);

    // Update Waveform & UI Telemetry
    this.waveform.push(evalResult.angle);
    const targetDeg = this.evaluator.mode === 'gym' ? 90 : this.evaluator.therapySafeThresholds[this.evaluator.currentExercise];
    this.waveform.render(this.evaluator.mode, targetDeg);

    this.updateTelemetryUI(evalResult);

    // Render Wireframe, 3D Avatar, Arc, and Joint Badges
    const isOptimal = !evalResult.isFault;
    const isMirrored = this.isCameraRunning && !this.video.classList.contains('non-mirrored');

    if (!this.isSimulationRunning) {
      // Live Camera / Uploaded Video: 2D skeletal tracking directly on the video feed
      this.hud.drawGrid(false);
      this.hud.renderSkeleton(landmarks, side, this.evaluator.currentExercise, evalResult.angle, isOptimal, isMirrored, false);
    } else {
      // Simulation Mode:
      const has3DAvatar = this.avatar3d && this.avatar3d.isReady && this.avatarCanvas && this.avatarCanvas.style.display !== 'none';
      if (has3DAvatar) {
        // Clear 2D HUD canvas completely — 3D avatar handles full visualization
        this.hud.clear();
        this.avatar3d.updatePose(landmarks, this.evaluator.currentExercise, side, evalResult.isFault);
      } else {
        // High-fidelity fallback: full 2D wireframe skeleton + dark grid backdrop
        this.hud.drawGrid(true, false);
        this.hud.renderSkeleton(landmarks, side, this.evaluator.currentExercise, evalResult.angle, isOptimal, false, false);
      }
    }

    // If new rep completed, add to table & trigger post-rep Coach Tip (only on live physical camera)
    if (evalResult.newRecord && evalResult.newRecord !== this.lastRenderedRecord) {
      this.lastRenderedRecord = evalResult.newRecord;
      this.appendRepHistory(evalResult.newRecord);
      if (this.isCameraRunning && !this.isSimulationRunning) {
        this.showPostRepCoachTip(evalResult.newRecord);
      }
    }
  }

  updateTelemetryUI(res) {
    const angleValEl = document.getElementById('liveAngleValue');
    angleValEl.textContent = `${res.angle}°`;
    angleValEl.style.color = res.isFault ? '#ef4444' : (res.guidanceType === 'optimal' ? 'var(--success)' : 'var(--primary)');

    // Circular Dial Progress
    const dialBar = document.getElementById('dialProgressBar');
    const circumference = 2 * Math.PI * 45; // 282.74
    const fraction = Math.min(1, Math.max(0, res.angle / 180));
    dialBar.style.strokeDashoffset = circumference * (1 - fraction);
    dialBar.style.stroke = res.isFault ? '#ef4444' : (res.guidanceType === 'optimal' ? 'var(--success)' : 'var(--primary)');

    // Form Compliance Score
    const scoreVal = Math.round(res.complianceScore);
    const scoreTextEl = document.getElementById('complianceScoreText');
    scoreTextEl.textContent = `${scoreVal}%`;
    scoreTextEl.style.color = res.isFault ? '#ef4444' : (scoreVal >= 80 ? 'var(--success)' : 'var(--warning)');

    const fillBarEl = document.getElementById('complianceFillBar');
    fillBarEl.style.width = `${scoreVal}%`;
    fillBarEl.style.background = res.isFault ? '#ef4444' : (scoreVal >= 80 ? 'var(--success)' : 'var(--warning)');

    // Four Statistics Metrics
    document.getElementById('repCountVal').textContent = res.repCount;
    document.getElementById('peakRomVal').textContent = `${res.peakRom}°`;
    document.getElementById('faultCountVal').textContent = res.faultCount;

    // Viewport Fault Alert glow
    const vpContainer = document.getElementById('viewportContainer');
    if (vpContainer) {
      vpContainer.classList.toggle('has-fault', !!res.isFault);
    }

    // Active Joint Badge Alert color
    const jointBadge = document.getElementById('hudActiveJointBadge');
    if (jointBadge) {
      jointBadge.style.borderColor = res.isFault ? 'rgba(239, 68, 68, 0.8)' : '';
      jointBadge.style.color = res.isFault ? '#ef4444' : '';
      jointBadge.style.boxShadow = res.isFault ? '0 0 12px rgba(239, 68, 68, 0.4)' : '';
    }

    // Live Tracking Dot and Text
    const dot = document.getElementById('hudLiveDot');
    const trackingText = document.getElementById('hudTrackingText');
    if (dot && trackingText) {
      if (res.isFault) {
        dot.style.background = '#ef4444';
        dot.style.boxShadow = '0 0 10px #ef4444';
        trackingText.textContent = 'FAULT DETECTED';
        trackingText.style.color = '#ef4444';
      } else {
        dot.style.background = '';
        dot.style.boxShadow = '';
        trackingText.textContent = this.isSimulationRunning ? 'SIMULATION' : 'TRACKING';
        trackingText.style.color = '';
      }
    }

    // Guidance Banner: Suppressed completely during 3D Simulation (only used for live physical camera)
    const banner = document.getElementById('hudGuidanceBanner');
    if (banner) {
      if (this.isSimulationRunning) {
        // In 3D simulation, ONLY show a banner if user clicked "Test Fault" button
        if (res.isFault && this.simFaultActive) {
          banner.style.display = 'flex';
          banner.className = 'hud-guidance-banner fault';
          banner.classList.remove('hidden');
          const badgeEl = document.getElementById('hudGuidanceBadge');
          const iconEl = document.getElementById('hudGuidanceIcon');
          const msgEl = document.getElementById('hudGuidanceText');
          if (badgeEl) badgeEl.textContent = 'SIMULATED FAULT';
          if (iconEl) iconEl.textContent = '⚠️';
          if (msgEl) msgEl.textContent = res.guidanceText;
        } else {
          banner.style.display = 'none';
          banner.classList.add('hidden');
        }
        return;
      }

      const msgEl = document.getElementById('hudGuidanceText');
      const iconEl = document.getElementById('hudGuidanceIcon');
      const badgeEl = document.getElementById('hudGuidanceBadge');

      if (res.isFault) {
        if (this.postRepCoachTipTimer) {
          clearTimeout(this.postRepCoachTipTimer);
          this.postRepCoachTipTimer = null;
          this.isShowingPostRepTip = false;
        }
        banner.style.display = 'flex';
        banner.className = 'hud-guidance-banner fault';
        banner.classList.remove('hidden');
        if (badgeEl) badgeEl.textContent = 'FORM FAULT';
        if (iconEl) iconEl.textContent = '⚠️';
        if (msgEl) msgEl.textContent = res.guidanceText;
      } else if (res.guidanceType === 'optimal') {
        banner.style.display = 'flex';
        banner.className = 'hud-guidance-banner optimal';
        banner.classList.remove('hidden');
        if (badgeEl) badgeEl.textContent = 'OPTIMAL';
        if (iconEl) iconEl.textContent = '✨';
        if (msgEl) msgEl.textContent = res.guidanceText;
      } else {
        // Generic coach tips are NOT displayed during active exercise motion
        if (!this.isShowingPostRepTip) {
          banner.style.display = 'none';
        }
      }
    }
  }

  appendRepHistory(record) {
    const tbody = document.getElementById('repHistoryBody');
    const emptyRow = document.getElementById('emptyHistoryRow');
    if (emptyRow) emptyRow.remove();

    document.getElementById('secondaryMetricVal').textContent = record.duration;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${record.id}</td>
      <td style="color: #fff; font-weight: 600;">${record.exercise}</td>
      <td>${record.peakRom}</td>
      <td>${record.duration}</td>
      <td><span class="status-pill ${record.status === 'PASS' ? 'pass' : 'fault'}">${record.status}</span></td>
    `;
    tbody.prepend(tr);

    const countBadge = document.getElementById('historyCountBadge');
    if (countBadge) countBadge.textContent = this.evaluator.repHistory.length;
  }

  /**
   * Display Coach Tip AFTER a repetition has been completed.
   * ONLY displayed during live physical camera sessions, NEVER during simulation.
   */
  showPostRepCoachTip(record) {
    // Suppress coach tip popups during simulation
    if (this.isSimulationRunning || !this.isCameraRunning) {
      this.dismissCoachTip();
      return;
    }

    const banner = document.getElementById('hudGuidanceBanner');
    if (!banner) return;

    const msgEl = document.getElementById('hudGuidanceText');
    const iconEl = document.getElementById('hudGuidanceIcon');
    const badgeEl = document.getElementById('hudGuidanceBadge');

    const exId = this.evaluator.currentExercise;
    const exData = getExerciseDefinition(exId) || GYM_EXERCISES[exId] || PT_EXERCISES[exId];
    const rawTip = exData ? exData.tip.replace(/<[^>]+>/g, '').replace(/^[⚡💪💡]\s*/, '') : 'Maintain joint alignment throughout.';

    if (this.postRepCoachTipTimer) {
      clearTimeout(this.postRepCoachTipTimer);
    }

    this.isShowingPostRepTip = true;
    banner.style.display = 'flex';
    banner.className = 'hud-guidance-banner info';
    banner.classList.remove('hidden');

    if (badgeEl) badgeEl.textContent = `COACH TIP · REP #${record.id} DONE`;
    if (iconEl) iconEl.textContent = '💡';
    if (msgEl) msgEl.textContent = `${record.status === 'PASS' ? 'Good rep! ' : ''}${rawTip}`;

    // Display for 18 seconds (ample reading time) then gently fade out
    this.postRepCoachTipTimer = setTimeout(() => {
      this.dismissCoachTip();
    }, 18000);
  }

  /**
   * Display Coach Tip AFTER the entire exercise session has finished.
   * ONLY displayed for live camera sessions if user actually completed reps (repCount > 0).
   * NEVER displayed in simulation mode.
   */
  showPostSessionCoachTip() {
    // Suppress coach tip popups during simulation
    if (this.isSimulationRunning || !this.isCameraRunning) {
      this.dismissCoachTip();
      return;
    }

    const banner = document.getElementById('hudGuidanceBanner');
    if (!banner) return;

    const reps = this.evaluator ? this.evaluator.repCount : 0;
    // DO NOT show exercise complete tip before user does anything!
    if (reps === 0) {
      this.dismissCoachTip();
      return;
    }

    const msgEl = document.getElementById('hudGuidanceText');
    const iconEl = document.getElementById('hudGuidanceIcon');
    const badgeEl = document.getElementById('hudGuidanceBadge');

    const exId = this.evaluator.currentExercise;
    const exData = getExerciseDefinition(exId) || GYM_EXERCISES[exId] || PT_EXERCISES[exId];
    const rawTip = exData ? exData.tip.replace(/<[^>]+>/g, '').replace(/^[⚡💪💡]\s*/, '') : 'Great work keeping disciplined form.';
    const score = Math.round(this.evaluator.complianceScore);

    this.isShowingPostRepTip = true;
    banner.style.display = 'flex';
    banner.className = 'hud-guidance-banner info show-post-tip';
    banner.classList.remove('hidden');

    if (badgeEl) badgeEl.textContent = 'COACH TIP · EXERCISE COMPLETE';
    if (iconEl) iconEl.textContent = '💡';
    const summaryMsg = `Exercise Finished (${reps} reps · ${score}% score). Coach Tip: ${rawTip}`;
    if (msgEl) msgEl.textContent = summaryMsg;

    // Automatically preserve in AI Coach chat history for reference
    this.addChatBubble('assistant', `🏁 **Exercise Completed (${reps} reps · ${score}% compliance)**\n\n💡 **Biomechanical Coach Tip:** ${rawTip}`);

    // Auto-dismiss after 20 seconds
    if (this.postRepCoachTipTimer) clearTimeout(this.postRepCoachTipTimer);
    this.postRepCoachTipTimer = setTimeout(() => {
      this.dismissCoachTip();
    }, 20000);
  }

  dismissCoachTip(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (this.postRepCoachTipTimer) {
      clearTimeout(this.postRepCoachTipTimer);
      this.postRepCoachTipTimer = null;
    }
    this.isShowingPostRepTip = false;
    const banner = document.getElementById('hudGuidanceBanner');
    if (banner) {
      banner.style.display = 'none';
      banner.classList.add('hidden');
    }
  }

  setDashboardTab(tabName) {
    const tabs = ['waveform', 'standards', 'history'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
      const pane = document.getElementById(`deckPane${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (pane) pane.classList.toggle('active', t === tabName);
    });

    if (tabName === 'waveform') {
      const ex = GYM_EXERCISES[this.evaluator.currentExercise] || PT_EXERCISES[this.evaluator.currentExercise];
      const targetDeg = this.evaluator.mode === 'gym' ? (ex?.defaultTarget || 90) : (this.evaluator.therapySafeThresholds[this.evaluator.currentExercise] || 90);
      this.waveform.render(this.evaluator.mode, targetDeg);
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

    // Auto-focus chat input & scroll messages to bottom
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
    const isCurrentlyOpen = drawer.classList.contains('open') && drawer.style.transform === 'translateX(0px)';
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

  // ── Hands-Free "Hey Coach" Voice Interaction ──────────────────

  handleVoiceWakeButtonClick() {
    if (!this.voiceListener) return;

    const drawer = document.getElementById('aiCoachDrawer');
    const isDrawerOpen = drawer && drawer.classList.contains('open');

    // If drawer is closed, clicking "Hey Coach" button immediately opens AI Coach and listens!
    if (!isDrawerOpen) {
      this.openCoachDrawer();
      if (this.audio) this.audio.playCoachWakeChime();
      this.voiceListener.startListeningQuery();
      this.showListeningIndicatorInChat();
      this.showVoiceHudToast('Listening to your form question...');
      return;
    }

    // If drawer is already open, toggle hands-free listening state
    this.toggleVoiceWake();
  }

  handleMicButtonClick() {
    if (!this.voiceListener) return;

    if (this.voiceListener.isAwaitingQuestion) {
      // User tapped to stop recording and send
      this.voiceListener.stopListeningQuery();
      this.removeListeningIndicatorFromChat();
      const input = document.getElementById('aiChatInput');
      if (input && input.value.trim().length > 1) {
        this.sendChatMessage(input.value.trim());
        input.value = '';
      }
    } else {
      // User tapped to start speaking directly
      this.openCoachDrawer();
      if (this.audio) this.audio.playCoachWakeChime();
      this.voiceListener.startListeningQuery();
      this.showListeningIndicatorInChat();
      this.showVoiceHudToast('Listening... Speak your form question');
    }
  }

  toggleVoiceWake() {
    if (!this.voiceListener) return;
    const isNowActive = this.voiceListener.toggle();
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

    this.showToast(
      isNowActive ? 'Hands-Free Voice Active: Say "Hey Coach" anytime!' : 'Hands-Free Voice Muted',
      isNowActive ? '🎙️' : '🔇'
    );
  }

  handleWakeDetected(initialQuery) {
    // Play futuristic wake acknowledgement chime
    if (this.audio) {
      this.audio.playCoachWakeChime();
    }

    // Instantly open AI Coach drawer so user SEES the AI coach as soon as they speak
    this.openCoachDrawer();

    // Show HUD toast acknowledging wake word
    this.showVoiceHudToast(initialQuery || 'Listening for your question...');

    // Show listening wave indicator right in the AI Coach conversation
    this.showListeningIndicatorInChat();
  }

  handleWakeWordQuery(query) {
    this.removeListeningIndicatorFromChat();
    this.openCoachDrawer();

    // If a specific question was asked, forward it directly to the AI Coach
    if (query && query.trim().length > 1) {
      setTimeout(() => {
        this.sendChatMessage(query.trim());
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

  updateVoiceWakeUI(isListening, isAwaitingQuestion) {
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
    if (toast) {
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

  // ── AI Coach Chat System ──────────────────────────────────────

  async sendChatMessage(userText) {
    if (!userText || !userText.trim() || this.gemini.isLoading) return;
    userText = userText.trim();

    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('btnSendChat');
    if (input) input.value = '';
    if (sendBtn) sendBtn.disabled = true;

    // Add user bubble
    this.addChatBubble('user', userText);

    // Show typing indicator
    this.showTypingIndicator(true);

    // Build session context
    const exName = (GYM_EXERCISES[this.evaluator.currentExercise] || PT_EXERCISES[this.evaluator.currentExercise])?.name || this.evaluator.currentExercise;
    const sessionCtx = {
      exercise: exName,
      mode: this.evaluator.mode,
      reps: this.evaluator.repCount,
      peakRom: `${this.evaluator.peakRom}°`,
      compliance: Math.round(this.evaluator.complianceScore),
      faults: this.evaluator.faultCount
    };

    const result = await this.gemini.chat(userText, sessionCtx);

    this.showTypingIndicator(false);
    if (sendBtn) sendBtn.disabled = false;

    if (result.success && result.text) {
      this.addChatBubble('assistant', result.text);
      // Speak response if voice is enabled (strip markdown tokens before speaking)
      if (this._voiceEnabled && this.voice) {
        const spoken = result.text.replace(/[*_#•]/g, '').replace(/⚡|⚠️|🌟|👍|🤖/g, '');
        this.voice.speak(spoken);
      }
    } else {
      // Graceful biomechanics coaching fallback — never dump raw API JSON to the user!
      const fallbackResponse = this.gemini.generateSmartFallback(userText, sessionCtx);
      this.addChatBubble('assistant', fallbackResponse);
      if (this._voiceEnabled && this.voice) {
        const spoken = fallbackResponse.replace(/[*_#•]/g, '').replace(/⚡|⚠️|🌟|👍|🤖/g, '');
        this.voice.speak(spoken);
      }
    }
  }

  async requestAutoAnalysis() {
    if (this.gemini.isLoading) return;

    const sendBtn = document.getElementById('btnSendChat');
    if (sendBtn) sendBtn.disabled = true;

    // Add auto-analysis user message
    this.addChatBubble('user', '📊 Analyze my current session');
    this.showTypingIndicator(true);

    const exName = (getExerciseDefinition(this.evaluator.currentExercise) || GYM_EXERCISES[this.evaluator.currentExercise] || PT_EXERCISES[this.evaluator.currentExercise])?.name || this.evaluator.currentExercise;

    const sessionData = {
      exercise: exName,
      mode: this.evaluator.mode,
      reps: this.evaluator.repCount,
      peakRom: `${this.evaluator.peakRom}°`,
      compliance: Math.round(this.evaluator.complianceScore),
      faults: this.evaluator.faultCount,
      history: this.evaluator.repHistory
    };

    const result = await this.gemini.analyzeSession(sessionData);

    this.showTypingIndicator(false);
    if (sendBtn) sendBtn.disabled = false;

    if (result.success && result.text) {
      this.addChatBubble('assistant', result.text);
      if (this._voiceEnabled && this.voice) {
        const spoken = result.text.replace(/[*_#•]/g, '').replace(/⚡|⚠️|🌟|👍|🤖/g, '');
        this.voice.speak(spoken);
      }
      this.showToast('AI Coach analysis ready', '✨');
    } else {
      const fallbackResponse = this.gemini.generateSmartFallback('Analyze my workout session', sessionData);
      this.addChatBubble('assistant', fallbackResponse);
      if (this._voiceEnabled && this.voice) {
        const spoken = fallbackResponse.replace(/[*_#•]/g, '').replace(/⚡|⚠️|🌟|👍|🤖/g, '');
        this.voice.speak(spoken);
      }
      this.showToast('AI Coach analysis ready', '✨');
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

    // Parse markdown-like formatting
    const formatted = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    content.innerHTML = `<p>${formatted}</p>`;

    bubble.appendChild(avatar);
    bubble.appendChild(content);
    container.appendChild(bubble);

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  showTypingIndicator(show) {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;

    // Remove existing indicator
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
    this._voiceEnabled = !this._voiceEnabled;
    const btn = document.getElementById('btnVoiceToggle');
    if (btn) {
      btn.classList.toggle('active', this._voiceEnabled);
      btn.textContent = this._voiceEnabled ? '🔊 Voice' : '🔇 Voice';
    }
    if (!this._voiceEnabled && this.voice) {
      this.voice.stop();
    }
    this.showToast(this._voiceEnabled ? 'Voice responses enabled' : 'Voice responses muted', this._voiceEnabled ? '🔊' : '🔇');
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
    this.gemini.clearHistory();
    this.showToast('Chat history cleared', '🗑️');
  }

  promptApiKey() {
    const currentCustom = localStorage.getItem('flexalign_gemini_api_key') || '';
    const newKey = prompt(
      'Configure Google Gemini API Key:\n\n' +
      'Paste your Gemini API key (from https://aistudio.google.com/app/apikey) to use your dedicated quota.\n' +
      'Leave empty and press OK to restore default shared key.',
      currentCustom
    );

    if (newKey !== null) {
      this.gemini.setApiKey(newKey);
      if (newKey.trim()) {
        this.showToast('Custom Gemini API Key active! 🔑', '✨');
      } else {
        this.showToast('Using default shared Gemini Key', 'ℹ️');
      }
    }
  }

  setMode(mode) {
    this.evaluator.setMode(mode);
    const gymBtn = document.getElementById('gymModeBtn');
    const ptBtn = document.getElementById('ptModeBtn');
    const modeCard = document.getElementById('modeConfigCard');
    const ptSection = document.getElementById('ptControlsSection');
    const gymSection = document.getElementById('gymControlsSection');
    const selectEl = document.getElementById('exerciseSelect');

    // 1. Swap the global theme
    document.body.className = mode === 'gym' ? 'theme-gym' : 'theme-pt';

    // 2. Setup mode-specific variables
    let exerciseDict = getAllExercisesForMode(mode);
    
    // Clear and repopulate dropdown
    selectEl.innerHTML = '';
    Object.keys(exerciseDict).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      const isCustomPrefix = exerciseDict[key].isCustom ? '✨ ' : '';
      opt.textContent = `${isCustomPrefix}${mode === 'gym' ? '🏋️' : '🩺'} ${exerciseDict[key].name}`;
      selectEl.appendChild(opt);
    });

    if (mode === 'gym') {
      gymBtn.classList.add('active');
      ptBtn.classList.remove('active');
      modeCard.className = 'card mode-custom-card gym-mode-theme';
      ptSection.style.display = 'none';
      gymSection.style.display = 'block';
      document.getElementById('modeCardTitle').textContent = 'Gym Mode Standards & Strict Form Criteria';
      document.getElementById('modeBadgePill').textContent = 'FORM STRICT';
      document.getElementById('modeBadgePill').className = 'status-pill pass';
      
      // Update Metrics Titles
      document.getElementById('repCountTitle').textContent = 'Completed Reps';
      document.getElementById('peakRomTitle').textContent = 'Peak ROM Reached';
      document.getElementById('secondaryMetricTitle').textContent = 'Cadence / Tempo';
      document.getElementById('faultCountTitle').textContent = 'Form Faults';

      // Update Title Screen (Splash) for Gym Field
      const splash = document.getElementById('viewportSplash');
      if (splash) {
        splash.className = 'viewport-splash gym-splash';
        const badge = document.getElementById('splashModeBadge');
        if (badge) {
          badge.className = 'splash-mode-badge gym-badge';
          badge.innerHTML = '⚡ ATHLETIC KINEMATICS &amp; FORM';
        }
        const icon = document.getElementById('splashIcon');
        if (icon) icon.textContent = '🏋️';
        const title = document.getElementById('splashTitle');
        if (title) title.textContent = 'Strength & Form Kinematics';
        const desc = document.getElementById('splashDesc');
        if (desc) desc.textContent = 'Precision rep tracking, parallel depth validation, and explosive lockout telemetry. Eliminate form breakdown under load.';
        const chips = document.getElementById('splashChips');
        if (chips) {
          chips.innerHTML = `
            <span class="splash-chip"><span>📐</span> 90° Parallel Depth</span>
            <span class="splash-chip"><span>⚡</span> Strict Lockout Velocity</span>
            <span class="splash-chip"><span>⚠️</span> Real-time Fault Detection</span>
          `;
        }
        const camBtnText = document.getElementById('splashCamBtnText');
        if (camBtnText) camBtnText.textContent = 'Start Workout Cam';
        const camBtnIcon = document.getElementById('splashCamBtnIcon');
        if (camBtnIcon) camBtnIcon.textContent = '🏋️';
        const uploadBtnText = document.getElementById('splashUploadBtnText');
        if (uploadBtnText) uploadBtnText.textContent = 'Upload Lift Video';
        const simBtnText = document.getElementById('splashSimBtnText');
        if (simBtnText) simBtnText.textContent = 'Run 3D Lift Simulation';
      }

      this.showToast('Switched to 🏋️ Fitness / Gym Mode', '⚡');
    } else {
      ptBtn.classList.add('active');
      gymBtn.classList.remove('active');
      modeCard.className = 'card mode-custom-card pt-mode-theme';
      ptSection.style.display = 'block';
      gymSection.style.display = 'none';
      document.getElementById('modeCardTitle').textContent = 'Physical Therapy Target Settings';
      document.getElementById('modeBadgePill').textContent = 'CLINICAL ROM';
      document.getElementById('modeBadgePill').className = 'status-pill pass';

      // Update Metrics Titles
      document.getElementById('repCountTitle').textContent = 'Completed Cycles';
      document.getElementById('peakRomTitle').textContent = 'Current Extension';
      document.getElementById('secondaryMetricTitle').textContent = 'Hold Time';
      document.getElementById('faultCountTitle').textContent = 'Safety Warnings';

      // Update Title Screen (Splash) for Physical Therapy Field
      const splash = document.getElementById('viewportSplash');
      if (splash) {
        splash.className = 'viewport-splash pt-splash';
        const badge = document.getElementById('splashModeBadge');
        if (badge) {
          badge.className = 'splash-mode-badge pt-badge';
          badge.innerHTML = '🩺 CLINICAL REHABILITATION &amp; ROM';
        }
        const icon = document.getElementById('splashIcon');
        if (icon) icon.textContent = '🩺';
        const title = document.getElementById('splashTitle');
        if (title) title.textContent = 'Clinical ROM & Physical Therapy';
        const desc = document.getElementById('splashDesc');
        if (desc) desc.textContent = 'Precision joint goniometry, safe flexion excursion limits, and compensatory movement alerts tailored for active rehabilitation.';
        const chips = document.getElementById('splashChips');
        if (chips) {
          chips.innerHTML = `
            <span class="splash-chip"><span>🛡️</span> Safe Flexion Limit Guard</span>
            <span class="splash-chip"><span>📐</span> Vector Joint Goniometry</span>
            <span class="splash-chip"><span>📋</span> Clinical Excursion Log</span>
          `;
        }
        const camBtnText = document.getElementById('splashCamBtnText');
        if (camBtnText) camBtnText.textContent = 'Start Therapy Cam';
        const camBtnIcon = document.getElementById('splashCamBtnIcon');
        if (camBtnIcon) camBtnIcon.textContent = '🩺';
        const uploadBtnText = document.getElementById('splashUploadBtnText');
        if (uploadBtnText) uploadBtnText.textContent = 'Upload Rehab Video';
        const simBtnText = document.getElementById('splashSimBtnText');
        if (simBtnText) simBtnText.textContent = 'Run 3D Rehab Simulation';
      }

      this.showToast('Switched to 🩺 Physical Therapy Mode', '🩺');
    }

    // Auto-select the first exercise of the new mode
    const firstExercise = Object.keys(exerciseDict)[0];
    this.setExercise(firstExercise);
  }

  setExercise(exerciseId) {
    const ex = getExerciseDefinition(exerciseId) || GYM_EXERCISES[exerciseId] || PT_EXERCISES[exerciseId];
    if (!ex) return;

    // Clear any previous post-rep tip banner so newly selected exercise starts clean
    this.dismissCoachTip();

    this.evaluator.setExercise(exerciseId);
    this.evaluator.resetAll();

    const selectEl = document.getElementById('exerciseSelect');
    if (selectEl && selectEl.value !== exerciseId) {
      selectEl.value = exerciseId;
    }

    document.getElementById('activeJointName').textContent = ex.jointTitle;
    document.getElementById('hudActiveJointBadge').textContent = ex.hudBadge;

    const repFooter = document.getElementById('repTargetFooter');
    if (repFooter) repFooter.textContent = ex.repFooter;

    if (this.evaluator.mode === 'gym') {
      const gymCriterionEl = document.getElementById('gymDepthCriterion');
      const gymLockoutEl = document.getElementById('gymLockoutCriterion');
      if (gymCriterionEl) gymCriterionEl.textContent = ex.targetCriterion;
      if (gymLockoutEl) gymLockoutEl.textContent = ex.lockoutCriterion;
      const gymMovementTip = document.getElementById('gymMovementTip');
      if (gymMovementTip && ex.tip) gymMovementTip.innerHTML = ex.tip;
      // Initialize default targets if not present
      if (!this.evaluator.gymTargets) this.evaluator.gymTargets = {};
      this.evaluator.gymTargets[exerciseId] = ex.defaultTarget;
    } else {
      const slider = document.getElementById('safeRomSlider');
      const thresholdBadge = document.getElementById('thresholdDisplayBadge');
      if (!this.evaluator.therapySafeThresholds[exerciseId]) {
        this.evaluator.therapySafeThresholds[exerciseId] = ex.defaultSafeThreshold;
      }
      slider.min = ex.ptSliderMin;
      slider.max = ex.ptSliderMax;
      slider.value = this.evaluator.therapySafeThresholds[exerciseId];
      thresholdBadge.textContent = `${this.evaluator.therapySafeThresholds[exerciseId]}°`;
      document.getElementById('thresholdSliderLabel').textContent = ex.sliderLabel;
      document.getElementById('ptClinicalTip').innerHTML = ex.tip;
    }

    const targetDeg = this.evaluator.mode === 'gym' ? ex.defaultTarget : this.evaluator.therapySafeThresholds[exerciseId];
    this.waveform.render(this.evaluator.mode, targetDeg);
    this.showToast(`Exercise: ${ex.name.toUpperCase()}`, '🎯');

    // Reset live counter badges for newly selected exercise
    document.getElementById('repCountVal').textContent = '0';
    document.getElementById('peakRomVal').textContent = '0°';
    document.getElementById('faultCountVal').textContent = '0';
    document.getElementById('liveAngleValue').textContent = '0°';
  }

  setSide(side) {
    this.sidePreference = side;
    document.querySelectorAll('.side-chip').forEach(c => c.classList.remove('active'));
    if (side === 'auto') document.getElementById('sideAuto').classList.add('active');
    if (side === 'left') document.getElementById('sideLeft').classList.add('active');
    if (side === 'right') document.getElementById('sideRight').classList.add('active');
  }

  updateSafeThreshold(value) {
    this.evaluator.updateSafeThreshold(this.evaluator.currentExercise, value);
    document.getElementById('thresholdDisplayBadge').textContent = `${value}°`;
    this.waveform.render(this.evaluator.mode, parseInt(value, 10));
  }

  toggleSound() {
    const active = this.audio.toggleSound();
    const btn = document.getElementById('soundToggleBtn');
    btn.classList.toggle('active', active);
    document.getElementById('soundIcon').textContent = active ? '🔊' : '🔇';
    this.showToast(active ? 'Audio FX Enabled' : 'Audio FX Muted', active ? '🔊' : '🔇');
  }

  async startCamera() {
    this.stopStreams();
    this.audio.init();

    document.getElementById('viewportSplash').classList.add('hidden');
    document.getElementById('startCamBtn').style.display = 'none';
    document.getElementById('stopCamBtn').style.display = 'inline-flex';
    this.video.classList.remove('non-mirrored');

    // Hide 3D avatar when using live camera
    this.avatar3d.hide();

    // Show guidance banner for active camera session
    const banner = document.getElementById('hudGuidanceBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.classList.remove('hidden');
    }

    try {
      if (!this.pose) this.initMediaPipe();

      if (typeof Camera !== 'undefined') {
        this.camera = new Camera(this.video, {
          onFrame: async () => {
            if (this.isCameraRunning && this.pose) {
              await this.pose.send({ image: this.video });
            }
          },
          width: 1280,
          height: 720
        });
        await this.camera.start();
        // After start(), MediaPipe Camera sets video.srcObject — grab a reference now
        // so stopStreams() can kill the hardware tracks even if the wrapper fails
        if (this.video.srcObject) {
          this._activeStream = this.video.srcObject;
        }
        this.isCameraRunning = true;
        this.showToast('Camera active. Step back into full view.', '📷');
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' }
        });
        this._activeStream = stream;
        this.video.srcObject = stream;
        await this.video.play();
        this.isCameraRunning = true;
        this.runVideoLoop();
        this.showToast('Camera active via WebRTC.', '📷');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      this.showToast('Could not access camera. Try Demo Simulator or Video Upload.', '⚠️');
      document.getElementById('viewportSplash').classList.remove('hidden');
      document.getElementById('startCamBtn').style.display = 'inline-flex';
      document.getElementById('stopCamBtn').style.display = 'none';
    }
  }

  runVideoLoop() {
    const step = async () => {
      if (!this.isCameraRunning) return;
      if (this.video.readyState >= 2 && this.pose) {
        await this.pose.send({ image: this.video });
      }
      this.animFrameId = requestAnimationFrame(step);
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  stopStreams() {
    // Set flags FIRST so any in-flight rAF callbacks bail immediately
    this.isCameraRunning = false;
    this.isSimulationRunning = false;

    // Cancel any pending animation frame
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // --- Kill the MediaPipe Camera wrapper ---
    if (this.camera) {
      try { this.camera.stop(); } catch (e) {}
      this.camera = null;
    }

    // --- Nuke the video element's srcObject tracks ---
    if (this.video && this.video.srcObject) {
      try {
        this.video.srcObject.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
      } catch (e) {}
      this.video.srcObject = null;
    }

    // --- Also stop any stored stream reference ---
    if (this._activeStream) {
      try {
        this._activeStream.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
      } catch(e) {}
      this._activeStream = null;
    }

    // Fully reset the video element
    try {
      this.video.pause();
      this.video.src = '';
      this.video.load();
    } catch(e) {}

    document.getElementById('startCamBtn').style.display = 'inline-flex';
    document.getElementById('stopCamBtn').style.display = 'none';

    // Revert 3D Sim button to normal state
    const simBtn = document.getElementById('simBtn');
    if (simBtn) {
      simBtn.className = 'dock-btn demo';
      simBtn.innerHTML = '<span class="btn-icon">🎮</span> 3D Sim';
    }

    document.getElementById('hudLiveDot').classList.remove('active');
    document.getElementById('hudTrackingText').textContent = 'STANDBY';

    // Clear both canvases
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Show splash screen again
    const splash = document.getElementById('viewportSplash');
    if (splash) splash.classList.remove('hidden');

    // Hide 3D avatar
    this.avatar3d.hide();

    // Only show post-exercise coach tip after exercise is done IF reps were performed
    if (this.evaluator && this.evaluator.repCount > 0) {
      this.showPostSessionCoachTip();
    } else {
      this.dismissCoachTip();
    }

    this.showToast('Stream stopped.', '⏹');
  }

  handleVideoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.stopStreams();
    this.audio.init();

    document.getElementById('viewportSplash').classList.add('hidden');
    document.getElementById('startCamBtn').style.display = 'none';
    document.getElementById('stopCamBtn').style.display = 'inline-flex';
    this.video.classList.add('non-mirrored');

    // Show guidance banner for active video session
    const banner = document.getElementById('hudGuidanceBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.classList.remove('hidden');
    }

    // Hide 3D avatar for video upload
    this.avatar3d.hide();

    const videoURL = URL.createObjectURL(file);
    this.video.src = videoURL;
    this.video.loop = true;
    this.video.play().then(() => {
      this.isCameraRunning = true;
      this.runVideoLoop();
      this.showToast(`Analyzing video: ${file.name}`, '📁');
    }).catch(err => {
      console.error('Video error:', err);
      this.showToast('Could not play video.', '⚠️');
    });
  }

  startSimulation() {
    this.stopStreams();
    this.audio.init();

    document.getElementById('viewportSplash').classList.add('hidden');

    // Leave Camera button as Camera (do NOT put STOP on camera)
    document.getElementById('startCamBtn').style.display = 'inline-flex';
    document.getElementById('stopCamBtn').style.display = 'none';

    // Set the STOP icon on the 3D Sim button instead
    const simBtn = document.getElementById('simBtn');
    if (simBtn) {
      simBtn.className = 'dock-btn danger';
      simBtn.innerHTML = '<span class="btn-icon">⏹</span> Stop';
    }

    // Ensure coach tip banner is completely hidden during 3D simulation
    this.dismissCoachTip();

    this.isSimulationRunning = true;
    this.canvas.width = 1280;
    this.canvas.height = 720;

    // Initialize and show 3D avatar
    this._init3DAvatar();

    this.showToast('3D Simulation running. Drag to rotate avatar.', '🎮');

    const simLoop = () => {
      // Guard: bail immediately if stop was requested
      if (!this.isSimulationRunning) {
        this.animFrameId = null;
        return;
      }
      const lms = this.simulator.generateLandmarks(this.evaluator.currentExercise, this.simFaultActive);
      this.onPoseResults({
        image: { width: 1280, height: 720 },
        poseLandmarks: lms
      });
      this.animFrameId = requestAnimationFrame(simLoop);
    };

    this.animFrameId = requestAnimationFrame(simLoop);
  }

  toggleSimFault() {
    this.simFaultActive = !this.simFaultActive;
    const btn = document.getElementById('btnSimFault');
    if (btn) {
      btn.classList.toggle('active', this.simFaultActive);
      btn.innerHTML = this.simFaultActive ? '<span class="btn-icon">⚠️</span> Fault ON' : '<span class="btn-icon">⚠️</span> Test Fault';
    }
    this.showToast(
      this.simFaultActive ? 'Simulating Form Fault: Visual lines & avatar turn RED' : 'Simulating Optimal Form: Posture compliant',
      this.simFaultActive ? '⚠️' : '✅'
    );
  }

  _init3DAvatar() {
    if (!this.avatarCanvas) return;

    // 1. Force display block on DOM element immediately
    this.avatarCanvas.style.display = 'block';

    const viewportEl = document.getElementById('viewportContainer');
    const w = (viewportEl && viewportEl.clientWidth) ? viewportEl.clientWidth : 1280;
    const h = (viewportEl && viewportEl.clientHeight) ? viewportEl.clientHeight : 720;
    this.avatarCanvas.width = w;
    this.avatarCanvas.height = h;

    if (!this.avatar3d.isReady) {
      try {
        this.avatar3d.init(this.avatarCanvas);
      } catch (err) {
        console.error('Failed to initialize 3D avatar:', err);
      }
    }

    this.avatar3d.show();
  }

  toggleSimulation() {
    if (this.isSimulationRunning) {
      this.stopStreams();
      document.getElementById('viewportSplash').classList.remove('hidden');
    } else {
      this.startSimulation();
    }
  }

  resetSession() {
    this.evaluator.resetAll();
    this.waveform.reset();

    document.getElementById('repCountVal').textContent = '0';
    document.getElementById('peakRomVal').textContent = '0°';
    document.getElementById('faultCountVal').textContent = '0';
    document.getElementById('secondaryMetricVal').textContent = '--';
    document.getElementById('complianceScoreText').textContent = '100%';
    document.getElementById('complianceFillBar').style.width = '100%';
    document.getElementById('repHistoryBody').innerHTML = `
      <tr id="emptyHistoryRow">
        <td colspan="5" class="empty-table-msg">
          Session reset. Perform repetitions to view analytics.
        </td>
      </tr>
    `;
    const countBadge = document.getElementById('historyCountBadge');
    if (countBadge) countBadge.textContent = '0';

    if (!this.isCameraRunning && !this.isSimulationRunning) {
      const banner = document.getElementById('hudGuidanceBanner');
      if (banner) {
        banner.style.display = 'none';
        banner.className = 'hud-guidance-banner info hidden';
      }
    }

    this.showToast('Session reset successfully.', '🔄');
  }

  exportData() {
    const sessionPayload = {
      application: 'FlexAlign AI',
      mode: this.evaluator.mode,
      exercise: this.evaluator.currentExercise,
      timestamp: new Date().toISOString(),
      stats: {
        reps: this.evaluator.repCount,
        peakRomDeg: this.evaluator.peakRom,
        faults: this.evaluator.faultCount,
        complianceScore: `${Math.round(this.evaluator.complianceScore)}%`
      },
      history: this.evaluator.repHistory
    };

    const blob = new Blob([JSON.stringify(sessionPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flexalign_${this.evaluator.currentExercise}_${this.evaluator.mode}_session.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Session exported to JSON file.', '📥');
  }

  showToast(message, icon = 'ℹ️') {
    const toast = document.getElementById('toastBanner');
    document.getElementById('toastMsg').textContent = message;
    document.getElementById('toastIcon').textContent = icon;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode')) this.setMode(params.get('mode'));
    if (params.get('exercise')) this.setExercise(params.get('exercise'));

    if (params.get('autosteps')) {
      this.canvas.width = 1280;
      this.canvas.height = 720;
      this.isSimulationRunning = true;
      document.getElementById('viewportSplash').classList.add('hidden');
      document.getElementById('startCamBtn').style.display = 'inline-flex';
      document.getElementById('stopCamBtn').style.display = 'none';
      const simBtn = document.getElementById('simBtn');
      if (simBtn) {
        simBtn.className = 'dock-btn danger';
        simBtn.innerHTML = '<span class="btn-icon">⏹</span> Stop';
      }

      const steps = parseInt(params.get('autosteps'), 10) || 300;
      const isFault = params.get('fault') === 'true';
      for (let i = 0; i < steps; i++) {
        const lms = this.simulator.generateLandmarks(this.evaluator.currentExercise, isFault);
        this.onPoseResults({ image: { width: 1280, height: 720 }, poseLandmarks: lms });
      }
    } else if (params.get('sim') === 'true' || params.get('demo') === 'true') {
      setTimeout(() => this.startSimulation(), 300);
    }
  }

  bindEvents() {
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const targetDeg = this.evaluator.mode === 'gym' ? 90 : this.evaluator.therapySafeThresholds[this.evaluator.currentExercise];
        this.waveform.render(this.evaluator.mode, targetDeg);

        // Resize 3D avatar if visible
        if (this.avatar3d.isReady && this.isSimulationRunning) {
          const viewportEl = document.getElementById('viewportContainer');
          if (viewportEl) {
            this.avatar3d.resize(viewportEl.clientWidth, viewportEl.clientHeight);
          }
        }
      }, 100);
    });

    // Keyboard shortcuts: 'F' for fault testing, 'Escape' to close AI Coach drawer
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCoachDrawer();
      }
      if ((e.key === 'f' || e.key === 'F') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        this.toggleSimFault();
      }
    });

    // Exercise dropdown explicit listener
    const exSelect = document.getElementById('exerciseSelect');
    if (exSelect) {
      const handleSelect = (e) => this.setExercise(e.target.value);
      exSelect.addEventListener('change', handleSelect);
      exSelect.addEventListener('input', handleSelect);
    }

    // Explicit Button Bindings (ensures 100% click reliability across all browsers)
    const bindClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    bindClick('gymModeBtn', () => this.setMode('gym'));
    bindClick('ptModeBtn', () => this.setMode('pt'));
    bindClick('soundToggleBtn', () => this.toggleSound());
    bindClick('sideAuto', () => this.setSide('auto'));
    bindClick('sideLeft', () => this.setSide('left'));
    bindClick('sideRight', () => this.setSide('right'));
    bindClick('startCamBtn', () => this.startCamera());
    bindClick('stopCamBtn', () => this.stopStreams());
    bindClick('simBtn', () => this.toggleSimulation());
    bindClick('btnSimFault', () => this.toggleSimFault());
    bindClick('tabBtnWaveform', () => this.setDashboardTab('waveform'));
    bindClick('tabBtnStandards', () => this.setDashboardTab('standards'));
    bindClick('tabBtnHistory', () => this.setDashboardTab('history'));

    // Dedicated AI Coach Drawer Open/Close triggers
    bindClick('aiCoachNavBtn', () => this.toggleCoachDrawer());
    bindClick('aiCoachFabBtn', () => this.toggleCoachDrawer());
    bindClick('btnCloseCoachDrawer', () => this.closeCoachDrawer());
    bindClick('aiCoachBackdrop', () => this.closeCoachDrawer());
    bindClick('btnCloseGuidanceBanner', (e) => this.dismissCoachTip(e));

    // Hands-free "Hey Coach" voice bindings
    bindClick('voiceWakeBtn', () => this.handleVoiceWakeButtonClick());
    bindClick('btnDrawerVoiceWake', () => this.toggleVoiceWake());

    // AI Coach Chat & Voice Input bindings
    bindClick('btnDrawerMic', () => this.handleMicButtonClick());
    bindClick('btnSendChat', () => {
      const input = document.getElementById('aiChatInput');
      if (input) this.sendChatMessage(input.value);
    });
    bindClick('btnAutoAnalyze', () => this.requestAutoAnalysis());
    bindClick('btnVoiceToggle', () => this.toggleVoice());
    bindClick('btnClearChat', () => this.clearChat());
    bindClick('btnApiKey', () => this.promptApiKey());
    bindClick('btnToggleCoachSection', () => this.toggleCoachDrawer());

    // Professional Voice Selector
    const voiceSelect = document.getElementById('aiVoiceSelect');
    if (voiceSelect) {
      voiceSelect.addEventListener('change', (e) => {
        if (this.voice) {
          this.voice.setVoice(e.target.value);
          const voiceName = voiceSelect.options[voiceSelect.selectedIndex].text;
          this.showToast(`AI Coach Voice: ${voiceName}`, '🎙️');
        }
      });
    }

    // Enter key on chat input
    const chatInput = document.getElementById('aiChatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage(chatInput.value);
        }
      });
    }

    // Bind reset/export by data-action for any dynamically created buttons too
    document.querySelectorAll('[data-action="reset"]').forEach(el => el.addEventListener('click', () => this.resetSession()));
    document.querySelectorAll('[data-action="export"]').forEach(el => el.addEventListener('click', () => this.exportData()));

    // Delegate stopCamBtn onclick removal — rely purely on JS binding
    const stopCamBtn = document.getElementById('stopCamBtn');
    if (stopCamBtn) stopCamBtn.removeAttribute('onclick');
  }

  // ── AI Exercise Lab Modal (Under 3D Sim) ──────────────────────

  openAiExerciseModal() {
    const modal = document.getElementById('aiExerciseModal');
    const labBtn = document.getElementById('btnOpenAiLab');
    if (!modal) return;

    modal.classList.remove('closing');
    modal.style.display = 'flex';
    if (labBtn) labBtn.classList.add('active');

    // Default to 'add' mode or keep current
    this.setAiLabTab(this.aiLabTab || 'add');

    // Focus input
    const promptInput = document.getElementById('aiExercisePrompt');
    if (promptInput) {
      setTimeout(() => promptInput.focus(), 150);
    }
  }

  closeAiExerciseModal() {
    const modal = document.getElementById('aiExerciseModal');
    const labBtn = document.getElementById('btnOpenAiLab');
    if (!modal) return;

    modal.classList.add('closing');
    if (labBtn) labBtn.classList.remove('active');

    setTimeout(() => {
      if (modal.classList.contains('closing')) {
        modal.style.display = 'none';
        modal.classList.remove('closing');
      }
    }, 250);
  }

  setAiLabTab(tab) {
    this.aiLabTab = tab;
    const tabAdd = document.getElementById('tabAddExercise');
    const tabModify = document.getElementById('tabModifyExercise');
    const promptLabel = document.getElementById('aiPromptLabel');
    const promptInput = document.getElementById('aiExercisePrompt');
    const submitBtnText = document.getElementById('btnAiGenerateText');
    const modifyRow = document.getElementById('aiModifyExerciseSelectRow');
    const modifySelect = document.getElementById('aiModifyExerciseSelect');

    if (tabAdd) tabAdd.classList.toggle('active', tab === 'add');
    if (tabModify) tabModify.classList.toggle('active', tab === 'modify');

    if (tab === 'modify') {
      if (modifyRow) modifyRow.style.display = 'block';

      // Populate exercise selector with all gym, pt, and custom exercises
      if (modifySelect) {
        modifySelect.innerHTML = '';

        const gymGroup = document.createElement('optgroup');
        gymGroup.label = '🏋️ Fitness / Strength Exercises';
        Object.keys(GYM_EXERCISES).forEach(id => {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = GYM_EXERCISES[id].name;
          gymGroup.appendChild(opt);
        });
        modifySelect.appendChild(gymGroup);

        const ptGroup = document.createElement('optgroup');
        ptGroup.label = '🩺 Physical Therapy Exercises';
        Object.keys(PT_EXERCISES).forEach(id => {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = PT_EXERCISES[id].name;
          ptGroup.appendChild(opt);
        });
        modifySelect.appendChild(ptGroup);

        const customKeys = Object.keys(CUSTOM_EXERCISES).filter(id => !GYM_EXERCISES[id] && !PT_EXERCISES[id]);
        if (customKeys.length > 0) {
          const customGroup = document.createElement('optgroup');
          customGroup.label = '✨ Custom Exercises';
          customKeys.forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `✨ ${CUSTOM_EXERCISES[id].name}`;
            customGroup.appendChild(opt);
          });
          modifySelect.appendChild(customGroup);
        }

        // Set default selection to exerciseToModify or evaluator.currentExercise
        const targetId = this.exerciseToModify || this.evaluator.currentExercise;
        if (targetId && modifySelect.querySelector(`option[value="${targetId}"]`)) {
          modifySelect.value = targetId;
        }

        if (!modifySelect._hasChangeListener) {
          modifySelect._hasChangeListener = true;
          modifySelect.addEventListener('change', () => {
            this.exerciseToModify = modifySelect.value;
            this.syncModifyExerciseSelection();
          });
        }
      }

      this.exerciseToModify = (modifySelect && modifySelect.value) ? modifySelect.value : (this.exerciseToModify || this.evaluator.currentExercise);
      this.syncModifyExerciseSelection();

      if (submitBtnText) submitBtnText.textContent = 'Modify with Gemini';
    } else {
      if (modifyRow) modifyRow.style.display = 'none';
      if (promptLabel) promptLabel.textContent = 'Describe Exercise or Biomechanical Adjustment:';
      if (promptInput && promptInput.value.includes('Adjust target angle to 80°')) {
        promptInput.value = '';
      }
      if (promptInput) promptInput.placeholder = 'e.g., Create a Romanian Deadlift focusing on hip hinge and hamstring depth, or Bulgarian Split Squats with vertical shin...';
      if (submitBtnText) submitBtnText.textContent = 'Generate with Gemini';
    }
  }

  syncModifyExerciseSelection() {
    const modifySelect = document.getElementById('aiModifyExerciseSelect');
    const selectedId = modifySelect ? modifySelect.value : (this.exerciseToModify || this.evaluator.currentExercise);
    const ex = getExerciseDefinition(selectedId) || GYM_EXERCISES[selectedId] || PT_EXERCISES[selectedId] || CUSTOM_EXERCISES[selectedId];
    if (!ex) return;

    const promptLabel = document.getElementById('aiPromptLabel');
    const promptInput = document.getElementById('aiExercisePrompt');
    const jointSelect = document.getElementById('aiTargetJoint');
    const modeSelect = document.getElementById('aiTargetMode');

    if (promptLabel) promptLabel.textContent = `Modify Biomechanics for "${ex.name}":`;
    if (promptInput) {
      promptInput.placeholder = `e.g. Set target depth to 80 degrees, make fault sensitivity stricter, or change focus to rehab...`;
      promptInput.value = `Adjust target angle to 80° with stricter lockout form for ${ex.name}`;
    }

    if (jointSelect && ex.jointLabel) jointSelect.value = ex.jointLabel;
    if (modeSelect && ex.mode) modeSelect.value = ex.mode;
  }

  applyAiPreset(presetKey) {
    const promptInput = document.getElementById('aiExercisePrompt');
    const jointSelect = document.getElementById('aiTargetJoint');
    const modeSelect = document.getElementById('aiTargetMode');

    this.setAiLabTab('add');

    const presets = {
      rdl: {
        prompt: 'Romanian Deadlift (RDL): Biomechanical hip hinge targeting hamstrings & glutes. Deep hinge to 75° with soft knees and flat spine.',
        joint: 'HIP',
        mode: 'gym'
      },
      split_squat: {
        prompt: 'Bulgarian Split Squat: Unilateral quad & glute hypertrophy. Lead knee descends to 85° depth while keeping shin vertical.',
        joint: 'KNEE',
        mode: 'gym'
      },
      pushup: {
        prompt: 'Standard Push-Up: Chest to floor press with 85° elbow depth, tight 45° elbow tuck, and anti-extension plank core.',
        joint: 'ELBOW',
        mode: 'gym'
      },
      wall_angels: {
        prompt: 'Wall Angels: Scapular retraction and thoracic mobility rehab with safe abduction reach arc up to 150° without lumbar arching.',
        joint: 'SHOULDER',
        mode: 'pt'
      },
      lunges: {
        prompt: 'Walking Lunges: Dynamic unilateral knee flexion to 90° with upright posture and controlled deceleration.',
        joint: 'KNEE',
        mode: 'gym'
      },
      bird_dog: {
        prompt: 'Bird Dog Quadruped Reach: Lumbar core stabilization (McGill Big 3). Reach opposite arm and leg parallel to floor without pelvic twist.',
        joint: 'HIP',
        mode: 'pt'
      },
      cat_cow: {
        prompt: 'Cat-Cow Spinal Segmentation: Cervical, thoracic, and lumbar segmentation arc from all-fours.',
        joint: 'HIP',
        mode: 'pt'
      },
      glute_bridge: {
        prompt: 'Glute Bridge: Supine hip extension driving through heels to 175° lockout with glute contraction.',
        joint: 'HIP',
        mode: 'pt'
      },
      mckenzie: {
        prompt: 'McKenzie Extension Press-Up: Prone lumbar spine decompression press-up while keeping pelvis pinned to floor.',
        joint: 'ELBOW',
        mode: 'pt'
      },
      row: {
        prompt: 'Bent-Over Barbell Row: 45° hinged torso pulling elbows past ribcage with scapular retraction.',
        joint: 'ELBOW',
        mode: 'gym'
      }
    };

    const preset = presets[presetKey];
    if (preset) {
      if (promptInput) promptInput.value = preset.prompt;
      if (jointSelect) jointSelect.value = preset.joint;
      if (modeSelect) modeSelect.value = preset.mode;
      // Auto-generate for instant gratification
      this.generateOrModifyAiExercise();
    }
  }

  applyAiSuggestion(promptText) {
    const promptInput = document.getElementById('aiExercisePrompt');
    if (promptInput) {
      promptInput.value = promptText;
    }
    const suggestionsCard = document.getElementById('aiExerciseSuggestionsCard');
    if (suggestionsCard) suggestionsCard.style.display = 'none';

    this.setAiLabTab('add');
    this.generateOrModifyAiExercise();
  }

  async generateOrModifyAiExercise() {
    const promptInput = document.getElementById('aiExercisePrompt');
    const jointSelect = document.getElementById('aiTargetJoint');
    const modeSelect = document.getElementById('aiTargetMode');
    const submitBtn = document.getElementById('btnAiGenerate');
    const submitIcon = document.getElementById('btnAiGenerateIcon');
    const submitText = document.getElementById('btnAiGenerateText');

    const userPrompt = promptInput ? promptInput.value.trim() : '';
    if (!userPrompt) {
      this.showToast('Please type an exercise description or select a preset chip', '⚠️');
      if (promptInput) promptInput.focus();
      return;
    }

    const selectedMode = modeSelect ? modeSelect.value : 'gym';
    const selectedJoint = jointSelect ? jointSelect.value : 'AUTO';

    // ─────────────────────────────────────────────────────────────
    // FAST PATH: Instant 0ms Synthesis for "Add" tab
    // Enables any exercise input to immediately produce 3D motion without network lag!
    // ─────────────────────────────────────────────────────────────
    if (this.aiLabTab === 'add') {
      const instantEx = synthesizeExerciseFromQuery(userPrompt, selectedMode);
      if (instantEx) {
        if (selectedJoint !== 'AUTO') {
          instantEx.jointLabel = selectedJoint;
        }
        instantEx.mode = selectedMode;
        this.currentGeneratedExercise = instantEx;
        registerExercise(instantEx);
        this.renderAiExercisePreview(instantEx);

        const suggestionsCard = document.getElementById('aiExerciseSuggestionsCard');
        if (suggestionsCard) suggestionsCard.style.display = 'none';

        if (this.audio) this.audio.playRepSuccess();
        this.showToast(`AI Lab: "${instantEx.name}" ready instantly! ⚡`, '🚀');

        if (submitBtn) submitBtn.classList.remove('loading');
        if (submitIcon) submitIcon.textContent = '⚡';
        if (submitText) submitText.textContent = 'Generate with Gemini';
        return;
      }
    }

    // Loading State
    if (submitBtn) submitBtn.classList.add('loading');
    if (submitIcon) submitIcon.textContent = '⏳';
    if (submitText) submitText.textContent = this.aiLabTab === 'modify' ? 'Gemini Modifying...' : 'Gemini Generating...';

    try {
      let result;
      if (this.aiLabTab === 'modify') {
        const modifySelect = document.getElementById('aiModifyExerciseSelect');
        const currentExId = (modifySelect && modifySelect.value) ? modifySelect.value : (this.exerciseToModify || this.evaluator.currentExercise);
        const currentEx = getExerciseDefinition(currentExId) || GYM_EXERCISES[currentExId] || PT_EXERCISES[currentExId] || CUSTOM_EXERCISES[currentExId];
        result = await this.gemini.modifyExercise(currentEx, userPrompt);
      } else {
        result = await this.gemini.generateExercise(userPrompt, selectedMode);
      }

      // Handle Unrecognized / Ambiguous Exercise with Suggestion Chips
      if (result && result.isUnrecognized) {
        const previewCard = document.getElementById('aiExercisePreviewCard');
        if (previewCard) previewCard.style.display = 'none';

        const suggestionsCard = document.getElementById('aiExerciseSuggestionsCard');
        const suggestionMsg = document.getElementById('aiSuggestionMsg');
        const pillsContainer = document.getElementById('aiSuggestionPills');

        if (suggestionsCard && pillsContainer) {
          if (suggestionMsg) {
            suggestionMsg.textContent = result.message || `We couldn't recognize "${userPrompt}". Did you mean one of these exercises?`;
          }
          pillsContainer.innerHTML = '';
          const suggestions = (result.suggestions && result.suggestions.length > 0)
            ? result.suggestions
            : [
                { name: 'Romanian Deadlift (RDL)', prompt: 'Romanian Deadlift hip hinge with dumbbell or barbell' },
                { name: 'Bulgarian Split Squat', prompt: 'Bulgarian Split Squat knee flexion and glute drive' },
                { name: 'Standard Push-Up', prompt: 'Standard Push-Up chest to floor with 45-degree elbow tuck' },
                { name: 'Bird Dog Reach', prompt: 'Bird Dog quadruped reach for lumbar spine stabilization' }
              ];

          suggestions.forEach(s => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'ai-suggestion-pill';
            pill.innerHTML = `<span>✨</span> <strong>${s.name}</strong>`;
            pill.title = s.prompt || s.name;
            pill.addEventListener('click', () => {
              this.applyAiSuggestion(s.prompt || s.name);
            });
            pillsContainer.appendChild(pill);
          });

          suggestionsCard.style.display = 'block';
          suggestionsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        this.showToast('Unrecognized exercise: select a suggestion chip', '💡');
        return;
      }

      if (result && result.exercise) {
        const suggestionsCard = document.getElementById('aiExerciseSuggestionsCard');
        if (suggestionsCard) suggestionsCard.style.display = 'none';

        const ex = result.exercise;

        // Apply explicit joint if user selected one instead of AUTO
        if (selectedJoint !== 'AUTO') {
          ex.jointLabel = selectedJoint;
        }
        ex.mode = selectedMode;

        this.currentGeneratedExercise = ex;
        registerExercise(ex);
        this.renderAiExercisePreview(ex);
        this.showToast(`AI Lab: "${ex.name}" updated successfully! ✨`, '🚀');

        if (this.audio) this.audio.playRepSuccess();
      } else {
        this.showToast('Could not generate exercise. Please try again.', '⚠️');
      }
    } catch (err) {
      console.error('Error generating AI exercise:', err);
      this.showToast('AI Lab error. Using biomechanical engine.', '⚠️');
    } finally {
      if (submitBtn) submitBtn.classList.remove('loading');
      if (submitIcon) submitIcon.textContent = '⚡';
      if (submitText) submitText.textContent = this.aiLabTab === 'modify' ? 'Modify with Gemini' : 'Generate with Gemini';
    }
  }

  renderAiExercisePreview(ex) {
    const previewCard = document.getElementById('aiExercisePreviewCard');
    if (!previewCard) return;

    document.getElementById('aiPreviewName').textContent = ex.name;
    document.getElementById('aiPreviewCategory').textContent = ex.category || (ex.mode === 'pt' ? 'Physical Therapy' : 'Athletic Kinematics');
    
    const modeTag = document.getElementById('aiPreviewModeTag');
    if (modeTag) {
      modeTag.textContent = ex.mode === 'pt' ? 'THERAPY MODE' : 'GYM MODE';
      modeTag.className = `preview-mode-tag ${ex.mode === 'pt' ? 'pt' : 'gym'}`;
    }

    document.getElementById('aiPreviewJoint').textContent = `${ex.jointLabel || 'KNEE'} (${ex.jointTitle || 'Kinematics'})`;
    document.getElementById('aiPreviewTarget').textContent = ex.targetCriterion || `≤ ${ex.defaultTarget || 90}°`;
    document.getElementById('aiPreviewLockout').textContent = ex.lockoutCriterion || '> 160°';
    document.getElementById('aiPreviewFault').textContent = ex.faultMessage || '⚠️ Biomechanical Misalignment';

    const motionEl = document.getElementById('aiPreviewMotion');
    if (motionEl && ex.motionProfile) {
      const mp = ex.motionProfile;
      const typeLabel = (mp.movementType || 'Dynamic').replace(/_/g, ' ');
      motionEl.textContent = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} (${mp.startAngle !== undefined ? mp.startAngle : 165}° ➔ ${mp.targetAngle !== undefined ? mp.targetAngle : (ex.defaultTarget || 80)}°)`;
    }

    const tipBox = document.getElementById('aiPreviewTip');
    if (tipBox) {
      tipBox.innerHTML = ex.tip || `⚡ <strong>Biomechanical Standard:</strong> Smooth cadence and full active excursion.`;
    }

    previewCard.style.display = 'flex';
    previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  launchGeneratedExercise() {
    if (!this.currentGeneratedExercise) {
      this.showToast('No exercise generated to launch', '⚠️');
      return;
    }

    const ex = this.currentGeneratedExercise;
    this.exerciseToModify = ex.id;
    registerExercise(ex);

    // If exercise belongs to a different mode, switch to that mode
    if (ex.mode !== this.evaluator.mode) {
      this.setMode(ex.mode);
    } else {
      // Repopulate dropdown
      const selectEl = document.getElementById('exerciseSelect');
      const allEx = getAllExercisesForMode(ex.mode);
      if (selectEl) {
        selectEl.innerHTML = '';
        Object.keys(allEx).forEach(key => {
          const opt = document.createElement('option');
          opt.value = key;
          const prefix = allEx[key].isCustom ? '✨ ' : '';
          opt.textContent = `${prefix}${ex.mode === 'gym' ? '🏋️' : '🩺'} ${allEx[key].name}`;
          selectEl.appendChild(opt);
        });
      }
    }

    // Select the new exercise
    this.setExercise(ex.id);

    // Close the modal with animation
    this.closeAiExerciseModal();

    // Start 3D simulation so user immediately observes the exercise kinematics in action!
    if (!this.isSimulationRunning) {
      this.startSimulation();
    }

    this.showToast(`🚀 Now running "${ex.name}" in 3D Simulation!`, '✨');
  }
}

// Resilient Bootloader
function bootApp() {
  try {
    const realApp = new FlexAlignApp();
    window._realApp = realApp;
    if (window.app && window.app._queue && window.app._queue.length) {
      const q = window.app._queue;
      window.app = realApp;
      q.forEach(item => {
        if (typeof realApp[item.fn] === 'function') realApp[item.fn].apply(realApp, item.args);
      });
    } else {
      window.app = realApp;
    }
  } catch (err) {
    console.error('Initialization error in FlexAlignApp:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
