/**
 * FlexAlign AI - Main Application Orchestrator
 * Coordinates core subsystems and modular component controllers:
 *  - CameraTracker (MediaPipe Pose, camera stream, side detection, video upload)
 *  - HUDManager (Telemetry, dials, compliance score, coach tips, toasts, 3D viewport navigation)
 *  - CallOverlay (Full-duplex voice call, soundwaves, barge-in)
 *  - CoachDrawer (AI Coach chat, "Hey Coach" voice wake, PTT mic)
 *  - AiLabModal (AI exercise generator, presets, biomechanical simulation)
 */

import { AudioEngine } from './audio.js';
import {
  GYM_EXERCISES,
  PT_EXERCISES,
  registerExercise,
  getExerciseDefinition,
  getAllExercisesForMode,
  CUSTOM_EXERCISES
} from './exercises.js';
import { ExerciseEvaluator } from './evaluator.js';
import { HUDRenderer } from './renderer.js';
import { WaveformChart } from './waveform.js';
import { MotionSimulator } from './simulator.js';
import { Avatar3DRenderer } from './avatar3d.js';
import { calculateJointAngle } from './math.js';
import { GeminiCoach } from './gemini.js';
import { ElevenLabsVoice } from './elevenlabs.js';
import { VoiceListener } from './voice-listener.js';

// Modular Sub-Controllers
import { CameraTracker } from './components/camera-tracker.js';
import { CallOverlay } from './components/call-overlay.js';
import { CoachDrawer } from './components/coach-drawer.js';
import { HUDManager } from './components/hud-manager.js';
import { AiLabModal } from './components/ai-lab-modal.js';

export class FlexAlignApp {
  constructor() {
    // 1. Core Subsystems
    this.audio = new AudioEngine();
    this.evaluator = new ExerciseEvaluator(this.audio);
    this.simulator = new MotionSimulator();
    this.avatar3d = new Avatar3DRenderer();
    this.gemini = new GeminiCoach();
    this.voice = new ElevenLabsVoice();
    this._voiceEnabled = true;

    // 2. DOM Elements
    this.video = document.getElementById('webcamVideo');
    this.canvas = document.getElementById('outputCanvas');
    this.chartCanvas = document.getElementById('angleChartCanvas');
    this.avatarCanvas = document.getElementById('avatarCanvas3D');

    this.hud = new HUDRenderer(this.canvas);
    this.waveform = new WaveformChart(this.chartCanvas);

    // 3. State Flags
    this.isCameraRunning = false;
    this.isSimulationRunning = false;
    this.isStreaming = false;
    this.simFaultActive = false;
    this.animFrameId = null;
    this.lastRenderedRecord = null;

    // 4. Instantiate Modular Component Controllers
    this.hudManager = new HUDManager({ app: this });
    this.coachDrawer = new CoachDrawer({ app: this });
    this.callOverlay = new CallOverlay({ app: this });
    this.aiLabModal = new AiLabModal({ app: this });
    this.cameraTracker = new CameraTracker({
      app: this,
      video: this.video,
      onPoseResults: (results) => this.onPoseResults(results),
      showToast: (msg, icon) => this.showToast(msg, icon)
    });

    // 5. Cross-wire Voice Engine speaking state for echo suppression & visual wave sync
    this.voice.onSpeakingStart = () => {
      if (this.voiceListener) this.voiceListener.setCoachSpeaking(true);
      this.callOverlay.updateCallSpeakingState(true);
    };

    this.voice.onSpeakingEnd = () => {
      if (this.voiceListener) this.voiceListener.setCoachSpeaking(false);
      this.callOverlay.updateCallSpeakingState(false);
    };

    // 6. Hands-Free "Hey Coach" Voice Listener & Interactive Call Engine
    this.voiceListener = new VoiceListener({
      onWakeDetected: (initialQuery) => this.coachDrawer.handleWakeDetected(initialQuery),
      onWakeWord: (query) => this.coachDrawer.handleWakeWordQuery(query),
      onListeningChange: (isListening, isAwaiting, isCall) => this.coachDrawer.updateVoiceWakeUI(isListening, isAwaiting, isCall),
      onInterimSpeech: (text, isAwaiting) => this.coachDrawer.updateVoiceInterimHUD(text, isAwaiting),
      onCallSpeechComplete: (query) => this.callOverlay.handleCallSpeechComplete(query),
      onUserBargeIn: (text) => this.callOverlay.handleUserBargeIn(text),
      onError: (err) => console.warn('Voice listener error:', err)
    });

    // 7. Initialize Subsystems & UI
    this.cameraTracker.initMediaPipe();
    this.bindEvents();
    this.setMode('gym');

    // Auto-start hands-free "Hey Coach" voice listener
    if (this.voiceListener && this.voiceListener.isSupported()) {
      this.voiceListener.start();
    }

    // Handle URL query parameters for direct demo & automated test runs
    this.handleUrlParams();
  }

  // Backwards compatibility property getters
  get isCallActive() { return this.callOverlay ? this.callOverlay.isCallActive : false; }
  get isCallMuted() { return this.callOverlay ? this.callOverlay.isCallMuted : false; }
  get pose() { return this.cameraTracker ? this.cameraTracker.pose : null; }
  get camera() { return this.cameraTracker ? this.cameraTracker.camera : null; }
  get sidePreference() { return this.cameraTracker ? this.cameraTracker.sidePreference : 'auto'; }
  set sidePreference(val) { if (this.cameraTracker) this.cameraTracker.sidePreference = val; }

  // ── Core Biomechanical Results Pipeline ─────────────────────────

  onPoseResults(results) {
    if (!results.image) return;

    this.hud.resize(results.image.width, results.image.height);
    this.hud.clear();

    const hudDot = document.getElementById('hudLiveDot');
    const hudText = document.getElementById('hudTrackingText');

    if (!results.poseLandmarks) {
      if (hudDot) hudDot.classList.remove('active');
      if (hudText) hudText.textContent = 'NO POSE DETECTED';
      return;
    }

    // Continuous Exercise Synchronizer: Ensure dropdown and evaluator never drift
    const selectEl = document.getElementById('exerciseSelect');
    if (selectEl && selectEl.value && selectEl.value !== this.evaluator.currentExercise) {
      this.setExercise(selectEl.value);
    }

    const landmarks = results.poseLandmarks;
    const side = this.cameraTracker.resolveActiveSide(landmarks, this.evaluator.currentExercise);
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

    this.hudManager.updateTelemetryUI(evalResult);

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
        this.hud.clear();
        this.avatar3d.updatePose(landmarks, this.evaluator.currentExercise, side, evalResult.isFault);
      } else {
        this.hud.drawGrid(true, false);
        this.hud.renderSkeleton(landmarks, side, this.evaluator.currentExercise, evalResult.angle, isOptimal, false, false);
      }
    }

    // If new rep completed, add to table & trigger post-rep Coach Tip (only on live physical camera)
    if (evalResult.newRecord && evalResult.newRecord !== this.lastRenderedRecord) {
      this.lastRenderedRecord = evalResult.newRecord;
      this.hudManager.appendRepHistory(evalResult.newRecord);
      if (this.isCameraRunning && !this.isSimulationRunning) {
        this.hudManager.showPostRepCoachTip(evalResult.newRecord);
      }
    }
  }

  // ── Mode & Exercise Management ──────────────────────────────────

  setMode(mode) {
    if (this.isSimulationRunning || this.isCameraRunning || this.isStreaming) {
      this.stopStreams(true);
    }

    this.evaluator.setMode(mode);
    const gymBtn = document.getElementById('gymModeBtn');
    const ptBtn = document.getElementById('ptModeBtn');
    const modeCard = document.getElementById('modeConfigCard');
    const ptSection = document.getElementById('ptControlsSection');
    const gymSection = document.getElementById('gymControlsSection');
    const selectEl = document.getElementById('exerciseSelect');

    document.body.className = mode === 'gym' ? 'theme-gym' : 'theme-pt';

    const exerciseDict = getAllExercisesForMode(mode);
    if (selectEl) {
      selectEl.innerHTML = '';
      Object.keys(exerciseDict).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        const isCustomPrefix = exerciseDict[key].isCustom ? '✨ ' : '';
        opt.textContent = `${isCustomPrefix}${mode === 'gym' ? '🏋️' : '🩺'} ${exerciseDict[key].name}`;
        selectEl.appendChild(opt);
      });
    }

    if (mode === 'gym') {
      if (gymBtn) gymBtn.classList.add('active');
      if (ptBtn) ptBtn.classList.remove('active');
      if (modeCard) modeCard.className = 'card mode-custom-card gym-mode-theme';
      if (ptSection) ptSection.style.display = 'none';
      if (gymSection) gymSection.style.display = 'block';

      const titleEl = document.getElementById('modeCardTitle');
      if (titleEl) titleEl.textContent = 'Gym Mode Standards & Strict Form Criteria';
      const pill = document.getElementById('modeBadgePill');
      if (pill) { pill.textContent = 'FORM STRICT'; pill.className = 'status-pill pass'; }

      const rc = document.getElementById('repCountTitle'); if (rc) rc.textContent = 'Completed Reps';
      const pr = document.getElementById('peakRomTitle'); if (pr) pr.textContent = 'Peak ROM Reached';
      const sm = document.getElementById('secondaryMetricTitle'); if (sm) sm.textContent = 'Cadence / Tempo';
      const fc = document.getElementById('faultCountTitle'); if (fc) fc.textContent = 'Form Faults';

      const splash = document.getElementById('viewportSplash');
      if (splash) {
        splash.className = 'viewport-splash gym-splash';
        const badge = document.getElementById('splashModeBadge'); if (badge) { badge.className = 'splash-mode-badge gym-badge'; badge.innerHTML = '⚡ ATHLETIC KINEMATICS &amp; FORM'; }
        const icon = document.getElementById('splashIcon'); if (icon) icon.textContent = '🏋️';
        const title = document.getElementById('splashTitle'); if (title) title.textContent = 'Strength & Form Kinematics';
        const desc = document.getElementById('splashDesc'); if (desc) desc.textContent = 'Precision rep tracking, parallel depth validation, and explosive lockout telemetry. Eliminate form breakdown under load.';
        const chips = document.getElementById('splashChips');
        if (chips) {
          chips.innerHTML = `
            <span class="splash-chip"><span>📐</span> 90° Parallel Depth</span>
            <span class="splash-chip"><span>⚡</span> Strict Lockout Velocity</span>
            <span class="splash-chip"><span>⚠️</span> Real-time Fault Detection</span>
          `;
        }
        const cbt = document.getElementById('splashCamBtnText'); if (cbt) cbt.textContent = 'Start Workout Cam';
        const cbi = document.getElementById('splashCamBtnIcon'); if (cbi) cbi.textContent = '🏋️';
        const ubt = document.getElementById('splashUploadBtnText'); if (ubt) ubt.textContent = 'Upload Lift Video';
        const sbt = document.getElementById('splashSimBtnText'); if (sbt) sbt.textContent = 'Run 3D Lift Simulation';
      }

      this.showToast('Switched to 🏋️ Fitness / Gym Mode', '⚡');
    } else {
      if (ptBtn) ptBtn.classList.add('active');
      if (gymBtn) gymBtn.classList.remove('active');
      if (modeCard) modeCard.className = 'card mode-custom-card pt-mode-theme';
      if (ptSection) ptSection.style.display = 'block';
      if (gymSection) gymSection.style.display = 'none';

      const titleEl = document.getElementById('modeCardTitle');
      if (titleEl) titleEl.textContent = 'Physical Therapy Target Settings';
      const pill = document.getElementById('modeBadgePill');
      if (pill) { pill.textContent = 'CLINICAL ROM'; pill.className = 'status-pill pass'; }

      const rc = document.getElementById('repCountTitle'); if (rc) rc.textContent = 'Completed Cycles';
      const pr = document.getElementById('peakRomTitle'); if (pr) pr.textContent = 'Current Extension';
      const sm = document.getElementById('secondaryMetricTitle'); if (sm) sm.textContent = 'Hold Time';
      const fc = document.getElementById('faultCountTitle'); if (fc) fc.textContent = 'Safety Warnings';

      const splash = document.getElementById('viewportSplash');
      if (splash) {
        splash.className = 'viewport-splash pt-splash';
        const badge = document.getElementById('splashModeBadge'); if (badge) { badge.className = 'splash-mode-badge pt-badge'; badge.innerHTML = '🩺 CLINICAL REHABILITATION &amp; ROM'; }
        const icon = document.getElementById('splashIcon'); if (icon) icon.textContent = '🩺';
        const title = document.getElementById('splashTitle'); if (title) title.textContent = 'Clinical ROM & Physical Therapy';
        const desc = document.getElementById('splashDesc'); if (desc) desc.textContent = 'Precision joint goniometry, safe flexion excursion limits, and compensatory movement alerts tailored for active rehabilitation.';
        const chips = document.getElementById('splashChips');
        if (chips) {
          chips.innerHTML = `
            <span class="splash-chip"><span>🛡️</span> Safe Flexion Limit Guard</span>
            <span class="splash-chip"><span>📐</span> Vector Joint Goniometry</span>
            <span class="splash-chip"><span>📋</span> Clinical Excursion Log</span>
          `;
        }
        const cbt = document.getElementById('splashCamBtnText'); if (cbt) cbt.textContent = 'Start Therapy Cam';
        const cbi = document.getElementById('splashCamBtnIcon'); if (cbi) cbi.textContent = '🩺';
        const ubt = document.getElementById('splashUploadBtnText'); if (ubt) ubt.textContent = 'Upload Rehab Video';
        const sbt = document.getElementById('splashSimBtnText'); if (sbt) sbt.textContent = 'Run 3D Rehab Simulation';
      }

      this.showToast('Switched to 🩺 Physical Therapy Mode', '🩺');
    }

    const firstExercise = Object.keys(exerciseDict)[0];
    this.setExercise(firstExercise);
  }

  setExercise(exerciseId) {
    const ex = getExerciseDefinition(exerciseId) || GYM_EXERCISES[exerciseId] || PT_EXERCISES[exerciseId];
    if (!ex) return;

    this.hudManager.dismissCoachTip();

    this.evaluator.setExercise(exerciseId);
    this.evaluator.resetAll();

    const selectEl = document.getElementById('exerciseSelect');
    if (selectEl && selectEl.value !== exerciseId) {
      selectEl.value = exerciseId;
    }

    const aj = document.getElementById('activeJointName'); if (aj) aj.textContent = ex.jointTitle;
    const hj = document.getElementById('hudActiveJointBadge'); if (hj) hj.textContent = ex.hudBadge;
    const rf = document.getElementById('repTargetFooter'); if (rf) rf.textContent = ex.repFooter;

    if (this.evaluator.mode === 'gym') {
      const gdc = document.getElementById('gymDepthCriterion'); if (gdc) gdc.textContent = ex.targetCriterion;
      const glc = document.getElementById('gymLockoutCriterion'); if (glc) glc.textContent = ex.lockoutCriterion;
      const gmt = document.getElementById('gymMovementTip'); if (gmt && ex.tip) gmt.innerHTML = ex.tip;
      if (!this.evaluator.gymTargets) this.evaluator.gymTargets = {};
      this.evaluator.gymTargets[exerciseId] = ex.defaultTarget;
    } else {
      const slider = document.getElementById('safeRomSlider');
      const thresholdBadge = document.getElementById('thresholdDisplayBadge');
      if (!this.evaluator.therapySafeThresholds[exerciseId]) {
        this.evaluator.therapySafeThresholds[exerciseId] = ex.defaultSafeThreshold;
      }
      if (slider) {
        slider.min = ex.ptSliderMin;
        slider.max = ex.ptSliderMax;
        slider.value = this.evaluator.therapySafeThresholds[exerciseId];
      }
      if (thresholdBadge) thresholdBadge.textContent = `${this.evaluator.therapySafeThresholds[exerciseId]}°`;
      const tsl = document.getElementById('thresholdSliderLabel'); if (tsl) tsl.textContent = ex.sliderLabel;
      const pct = document.getElementById('ptClinicalTip'); if (pct) pct.innerHTML = ex.tip;
    }

    const targetDeg = this.evaluator.mode === 'gym' ? ex.defaultTarget : this.evaluator.therapySafeThresholds[exerciseId];
    this.waveform.render(this.evaluator.mode, targetDeg);
    this.showToast(`Exercise: ${ex.name.toUpperCase()}`, '🎯');

    const rc = document.getElementById('repCountVal'); if (rc) rc.textContent = '0';
    const pr = document.getElementById('peakRomVal'); if (pr) pr.textContent = '0°';
    const fc = document.getElementById('faultCountVal'); if (fc) fc.textContent = '0';
    const la = document.getElementById('liveAngleValue'); if (la) la.textContent = '0°';
  }

  setSide(side) {
    this.sidePreference = side;
    document.querySelectorAll('.side-chip').forEach(c => c.classList.remove('active'));
    if (side === 'auto') { const el = document.getElementById('sideAuto'); if (el) el.classList.add('active'); }
    if (side === 'left') { const el = document.getElementById('sideLeft'); if (el) el.classList.add('active'); }
    if (side === 'right') { const el = document.getElementById('sideRight'); if (el) el.classList.add('active'); }
  }

  updateSafeThreshold(value) {
    this.evaluator.updateSafeThreshold(this.evaluator.currentExercise, value);
    const tb = document.getElementById('thresholdDisplayBadge');
    if (tb) tb.textContent = `${value}°`;
    this.waveform.render(this.evaluator.mode, parseInt(value, 10));
  }

  toggleSound() {
    const active = this.audio.toggleSound();
    const btn = document.getElementById('soundToggleBtn');
    if (btn) btn.classList.toggle('active', active);
    const icon = document.getElementById('soundIcon');
    if (icon) icon.textContent = active ? '🔊' : '🔇';
    this.showToast(active ? 'Audio FX Enabled' : 'Audio FX Muted', active ? '🔊' : '🔇');
  }

  // ── Stream & Simulation Lifecycles ──────────────────────────────

  async startCamera() {
    this.isSimulationRunning = false;
    await this.cameraTracker.startCamera();
    this.isCameraRunning = this.cameraTracker.isCameraRunning;
  }

  handleVideoUpload(e) {
    this.isSimulationRunning = false;
    this.cameraTracker.handleVideoUpload(e);
    this.isCameraRunning = this.cameraTracker.isCameraRunning;
  }

  startSimulation() {
    this.stopStreams(true);
    if (this.audio) this.audio.init();

    const splash = document.getElementById('viewportSplash');
    if (splash) splash.classList.add('hidden');

    const startBtn = document.getElementById('startCamBtn');
    if (startBtn) startBtn.style.display = 'inline-flex';
    const stopBtn = document.getElementById('stopCamBtn');
    if (stopBtn) stopBtn.style.display = 'none';

    const simBtn = document.getElementById('simBtn');
    if (simBtn) {
      simBtn.className = 'dock-btn danger';
      simBtn.innerHTML = '<span class="btn-icon">⏹</span> Stop';
    }

    this.hudManager.dismissCoachTip();

    this.isSimulationRunning = true;
    this.canvas.width = 1280;
    this.canvas.height = 720;

    this._init3DAvatar();

    const dock = document.getElementById('avatarControlDock');
    if (dock) dock.style.display = 'flex';
    const quickZoom = document.getElementById('avatarQuickZoomWidget');
    if (quickZoom) quickZoom.style.display = 'flex';
    const navHint = document.getElementById('avatarNavHint');
    if (navHint) navHint.style.display = 'block';

    this.showToast('3D Simulation running: Drag to rotate, Right-click to pan.', '🎮');

    const simLoop = () => {
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

  stopStreams(silent = false) {
    this.isCameraRunning = false;
    this.isSimulationRunning = false;
    this.isStreaming = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.cameraTracker) {
      this.cameraTracker.stopStreams();
    }

    const startBtn = document.getElementById('startCamBtn');
    if (startBtn) startBtn.style.display = 'inline-flex';
    const stopBtn = document.getElementById('stopCamBtn');
    if (stopBtn) stopBtn.style.display = 'none';

    const simBtn = document.getElementById('simBtn');
    if (simBtn) {
      simBtn.className = 'dock-btn demo';
      simBtn.innerHTML = '<span class="btn-icon">🎮</span> 3D Sim';
    }

    const hudDot = document.getElementById('hudLiveDot');
    if (hudDot) hudDot.classList.remove('active');
    const hudText = document.getElementById('hudTrackingText');
    if (hudText) hudText.textContent = 'STANDBY';

    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    const splash = document.getElementById('viewportSplash');
    if (splash) splash.classList.remove('hidden');

    if (this.avatar3d) this.avatar3d.hide();
    const dock = document.getElementById('avatarControlDock');
    if (dock) dock.style.display = 'none';
    const quickZoom = document.getElementById('avatarQuickZoomWidget');
    if (quickZoom) quickZoom.style.display = 'none';
    const navHint = document.getElementById('avatarNavHint');
    if (navHint) navHint.style.display = 'none';
    const tip = document.getElementById('avatarJointTooltip');
    if (tip) tip.style.display = 'none';

    if (this.evaluator && this.evaluator.repCount > 0) {
      this.hudManager.showPostSessionCoachTip();
    } else {
      this.hudManager.dismissCoachTip();
    }

    if (!silent) {
      this.showToast('Stream stopped.', '⏹');
    }
  }

  toggleSimulation() {
    if (this.isSimulationRunning) {
      this.stopStreams();
      const splash = document.getElementById('viewportSplash');
      if (splash) splash.classList.remove('hidden');
    } else {
      this.startSimulation();
    }
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

  async triggerAiFormAdvice() {
    const exObj = getExerciseDefinition(this.evaluator.currentExercise);
    const exName = (exObj && exObj.name) || this.evaluator.currentExercise;
    const btn = document.getElementById('btnAiFormAdvice');
    if (btn) btn.classList.add('loading');

    this.showToast('🤖 AI Biomechanics Coach analyzing current motion...', '✨');

    try {
      const liveAngle = Math.round(this.evaluator.currentAngle);
      const peakRom = Math.round(this.evaluator.peakRom);
      const isFault = this.evaluator.currentRepHadFault || this.simFaultActive;
      const faultDetails = isFault ? (exObj.faultMessage || 'Deviation from standard kinematic plane') : 'Clean cadence';
      const repCount = this.evaluator.repCount;

      let advice = await this.gemini.getLiveMovementAdjustments(
        exName,
        liveAngle,
        peakRom,
        isFault,
        faultDetails,
        repCount
      );

      if (!advice && this.evaluator._getSpecificMovementCue) {
        advice = this.evaluator._getSpecificMovementCue(exObj, liveAngle, exObj.defaultTarget || 90, exObj.isFlexion !== false, 'entering');
      }

      if (advice) {
        const banner = document.getElementById('hudGuidanceBanner');
        if (banner) {
          banner.style.display = 'flex';
          banner.className = 'hud-guidance-banner info';
          banner.classList.remove('hidden');
          const badgeEl = document.getElementById('hudGuidanceBadge');
          const iconEl = document.getElementById('hudGuidanceIcon');
          const msgEl = document.getElementById('hudGuidanceText');
          if (badgeEl) badgeEl.textContent = 'AI MOVEMENT ADVICE';
          if (iconEl) iconEl.textContent = '🤖';
          if (msgEl) msgEl.textContent = advice;
        }

        if (this.voice && typeof this.voice.speak === 'function') {
          this.voice.speak(advice.replace(/[*_#`]/g, ''));
        }

        this.showToast(advice, '💡');
      }
    } catch (e) {
      console.warn('AI form advice error:', e);
    } finally {
      if (btn) btn.classList.remove('loading');
    }
  }

  _init3DAvatar() {
    if (!this.avatarCanvas) return;

    this.avatarCanvas.style.display = 'block';

    const viewportEl = document.getElementById('viewportContainer');
    const w = (viewportEl && viewportEl.clientWidth) ? viewportEl.clientWidth : 1280;
    const h = (viewportEl && viewportEl.clientHeight) ? viewportEl.clientHeight : 720;
    this.avatarCanvas.width = w;
    this.avatarCanvas.height = h;

    if (!this.avatar3d.isReady) {
      try {
        this.avatar3d.init(this.avatarCanvas);

        this.avatar3d.onJointHover = (jointData, event) => {
          const tooltip = document.getElementById('avatarJointTooltip');
          if (!tooltip) return;
          if (!jointData) {
            tooltip.style.display = 'none';
            return;
          }
          const viewport = document.getElementById('viewportContainer');
          if (!viewport) return;
          const rect = viewport.getBoundingClientRect();
          tooltip.style.left = `${Math.min(rect.width - 100, Math.max(80, event.clientX - rect.left))}px`;
          tooltip.style.top = `${Math.min(rect.height - 40, Math.max(50, event.clientY - rect.top))}px`;

          const titleEl = document.getElementById('jointTipTitle');
          const angleEl = document.getElementById('jointTipAngle');
          const statusEl = document.getElementById('jointTipStatus');

          if (titleEl) titleEl.textContent = jointData.label || 'Active Joint';
          if (angleEl) angleEl.textContent = `${Math.round(this.evaluator.currentAngle || 0)}°`;

          const isOptimal = !this.evaluator.lastResult || !this.evaluator.lastResult.isFault;
          if (statusEl) {
            statusEl.textContent = isOptimal ? 'Optimal Form' : 'Fault Detected';
            statusEl.className = `joint-tip-status ${isOptimal ? 'optimal' : 'fault'}`;
          }
          tooltip.style.display = 'block';
        };

        this.avatar3d.onJointSelect = (jointData) => {
          this.showToast(`Inspecting ${jointData.label}: camera focused on joint.`, '🎯');
        };

        this.avatar3d.onCameraManualChange = () => {
          ['btnViewFront', 'btnViewSide', 'btnViewIso', 'btnViewTop'].forEach(id => {
            const b = document.getElementById(id);
            if (b) b.classList.remove('active');
          });
        };
      } catch (err) {
        console.error('Failed to initialize 3D avatar:', err);
      }
    }

    this.avatar3d.show();
  }

  // ── Session Controls & Delegation ───────────────────────────────

  resetSession() {
    this.evaluator.resetAll();
    this.waveform.reset();

    const rc = document.getElementById('repCountVal'); if (rc) rc.textContent = '0';
    const pr = document.getElementById('peakRomVal'); if (pr) pr.textContent = '0°';
    const fc = document.getElementById('faultCountVal'); if (fc) fc.textContent = '0';
    const sm = document.getElementById('secondaryMetricVal'); if (sm) sm.textContent = '--';
    const cs = document.getElementById('complianceScoreText'); if (cs) cs.textContent = '100%';
    const cf = document.getElementById('complianceFillBar'); if (cf) cf.style.width = '100%';
    const rh = document.getElementById('repHistoryBody');
    if (rh) {
      rh.innerHTML = `
        <tr id="emptyHistoryRow">
          <td colspan="5" class="empty-table-msg">
            Session reset. Perform repetitions to view analytics.
          </td>
        </tr>
      `;
    }
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

  // Delegated HUD Manager methods
  showToast(msg, icon) { return this.hudManager.showToast(msg, icon); }
  showPostRepCoachTip(r) { return this.hudManager.showPostRepCoachTip(r); }
  showPostSessionCoachTip() { return this.hudManager.showPostSessionCoachTip(); }
  dismissCoachTip(e) { return this.hudManager.dismissCoachTip(e); }
  setAvatarView(p) { return this.hudManager.setAvatarView(p); }
  panAvatar(dx, dy) { return this.hudManager.panAvatar(dx, dy); }
  zoomAvatar(f) { return this.hudManager.zoomAvatar(f); }
  resetAvatarView() { return this.hudManager.resetAvatarView(); }
  toggleAvatarAutoOrbit() { return this.hudManager.toggleAvatarAutoOrbit(); }
  toggleAvatarXRay() { return this.hudManager.toggleAvatarXRay(); }

  // Delegated Coach Drawer methods
  setDashboardTab(t) { return this.coachDrawer.setDashboardTab(t); }
  openCoachDrawer() { return this.coachDrawer.openCoachDrawer(); }
  closeCoachDrawer() { return this.coachDrawer.closeCoachDrawer(); }
  toggleCoachDrawer(f) { return this.coachDrawer.toggleCoachDrawer(f); }
  toggleCoachSection() { return this.coachDrawer.toggleCoachSection(); }
  handleVoiceWakeButtonClick() { return this.coachDrawer.handleVoiceWakeButtonClick(); }
  handleMicButtonClick() { return this.coachDrawer.handleMicButtonClick(); }
  toggleVoiceWake() { return this.coachDrawer.toggleVoiceWake(); }
  sendChatMessage(t, v) { return this.coachDrawer.sendChatMessage(t, v); }
  requestAutoAnalysis() { return this.coachDrawer.requestAutoAnalysis(); }
  addChatBubble(r, t) { return this.coachDrawer.addChatBubble(r, t); }
  showTypingIndicator(s) { return this.coachDrawer.showTypingIndicator(s); }
  toggleVoice() { return this.coachDrawer.toggleVoice(); }
  clearChat() { return this.coachDrawer.clearChat(); }
  promptApiKey() { return this.coachDrawer.promptApiKey(); }
  setVoiceRate(r) { return this.coachDrawer.setVoiceRate(r); }

  // Delegated Interactive Call Overlay methods
  toggleCallMode() { return this.callOverlay.toggleCallMode(); }
  startCallMode() { return this.callOverlay.startCallMode(); }
  endCallMode() { return this.callOverlay.endCallMode(); }
  toggleCallMute() { return this.callOverlay.toggleCallMute(); }
  interruptCoach() { return this.callOverlay.interruptCoach(); }

  // Delegated AI Exercise Lab Modal methods
  openAiExerciseModal() { return this.aiLabModal.openAiExerciseModal(); }
  closeAiExerciseModal() { return this.aiLabModal.closeAiExerciseModal(); }
  setAiLabTab(t) { return this.aiLabModal.setAiLabTab(t); }
  syncModifyExerciseSelection() { return this.aiLabModal.syncModifyExerciseSelection(); }
  applyAiPreset(p) { return this.aiLabModal.applyAiPreset(p); }
  applyAiSuggestion(p) { return this.aiLabModal.applyAiSuggestion(p); }
  generateOrModifyAiExercise() { return this.aiLabModal.generateOrModifyAiExercise(); }
  renderAiExercisePreview(e) { return this.aiLabModal.renderAiExercisePreview(e); }
  launchGeneratedExercise() { return this.aiLabModal.launchGeneratedExercise(); }

  // ── Event Bindings & Bootloader ─────────────────────────────────

  handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode')) this.setMode(params.get('mode'));
    if (params.get('exercise')) this.setExercise(params.get('exercise'));

    if (params.get('autosteps')) {
      this.canvas.width = 1280;
      this.canvas.height = 720;
      this.isSimulationRunning = true;
      const splash = document.getElementById('viewportSplash'); if (splash) splash.classList.add('hidden');
      const startCam = document.getElementById('startCamBtn'); if (startCam) startCam.style.display = 'inline-flex';
      const stopCam = document.getElementById('stopCamBtn'); if (stopCam) stopCam.style.display = 'none';
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

        if (this.avatar3d.isReady && this.isSimulationRunning) {
          const viewportEl = document.getElementById('viewportContainer');
          if (viewportEl) {
            this.avatar3d.resize(viewportEl.clientWidth, viewportEl.clientHeight);
          }
        }
      }, 100);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCoachDrawer();
      }
      if ((e.key === 'f' || e.key === 'F') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        this.toggleSimFault();
      }
    });

    const exSelect = document.getElementById('exerciseSelect');
    if (exSelect) {
      const handleSelect = (e) => this.setExercise(e.target.value);
      exSelect.addEventListener('change', handleSelect);
      exSelect.addEventListener('input', handleSelect);
    }

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
    bindClick('btnAiFormAdvice', () => this.triggerAiFormAdvice());
    bindClick('tabBtnWaveform', () => this.setDashboardTab('waveform'));
    bindClick('tabBtnStandards', () => this.setDashboardTab('standards'));
    bindClick('tabBtnHistory', () => this.setDashboardTab('history'));

    bindClick('aiCoachNavBtn', () => this.toggleCoachDrawer());
    bindClick('aiCoachFabBtn', () => this.toggleCoachDrawer());
    bindClick('btnCloseCoachDrawer', () => this.closeCoachDrawer());
    bindClick('aiCoachBackdrop', () => this.closeCoachDrawer());
    bindClick('btnCloseGuidanceBanner', (e) => this.dismissCoachTip(e));

    bindClick('callModeNavBtn', () => this.toggleCallMode());
    bindClick('btnDrawerCallMode', () => this.toggleCallMode());
    bindClick('btnCallMute', () => this.toggleCallMute());
    bindClick('btnCallInterrupt', () => this.interruptCoach());
    bindClick('btnEndCall', () => this.endCallMode());

    bindClick('voiceWakeBtn', () => this.handleVoiceWakeButtonClick());
    bindClick('btnDrawerVoiceWake', () => this.toggleVoiceWake());

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

    const voiceSpeedSelect = document.getElementById('aiVoiceSpeedSelect');
    if (voiceSpeedSelect) {
      voiceSpeedSelect.addEventListener('change', (e) => {
        this.setVoiceRate(e.target.value);
      });
    }

    const chatInput = document.getElementById('aiChatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage(chatInput.value);
        }
      });
    }

    document.querySelectorAll('[data-action="reset"]').forEach(el => el.addEventListener('click', () => this.resetSession()));
    document.querySelectorAll('[data-action="export"]').forEach(el => el.addEventListener('click', () => this.exportData()));

    const stopCamBtn = document.getElementById('stopCamBtn');
    if (stopCamBtn) stopCamBtn.removeAttribute('onclick');
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
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
